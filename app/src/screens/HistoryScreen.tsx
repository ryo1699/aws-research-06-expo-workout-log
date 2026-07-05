import { useCallback, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteSets, getAllSets } from '../db';
import { localDateKey, dateLabel } from '../format';
import { type WorkoutSet } from '../types';
import { SetRow } from '../components/SetRow';
import { colors } from '../theme';

type Section = {
  title: string;
  data: WorkoutSet[];
};

function groupByDate(sets: WorkoutSet[]): Section[] {
  const sections: Section[] = [];
  for (const set of sets) {
    const key = localDateKey(set.performed_at);
    const last = sections[sections.length - 1];
    if (last && last.title === key) {
      last.data.push(set);
    } else {
      sections.push({ title: key, data: [set] });
    }
  }
  return sections;
}

export function HistoryScreen() {
  const db = useSQLiteContext();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const reload = useCallback(() => {
    getAllSets(db).then((sets) => setSections(groupByDate(sets)));
  }, [db]);

  // 記録タブで追加・削除された内容を反映するため、タブ表示のたびに再読込する
  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        setSelectMode(false);
        setSelected(new Set());
      };
    }, [reload]),
  );

  const toggle = useCallback((set: WorkoutSet) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(set.id)) next.delete(set.id);
      else next.add(set.id);
      return next;
    });
  }, []);

  const allIds = sections.flatMap((s) => s.data.map((d) => d.id));
  const allSelected = allIds.length > 0 && selected.size === allIds.length;

  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
  }, [allIds]);

  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selected.size === 0) return;
    Alert.alert('まとめて削除', `選択した ${selected.size} 件の記録を削除しますか?`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteSets(db, [...selected]);
          exitSelect();
          reload();
        },
      },
    ]);
  }, [db, selected, exitSelect, reload]);

  return (
    <View style={styles.container}>
      {/* ツールバー */}
      <View style={styles.toolbar}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={styles.toolbarBtn}>{allSelected ? '全解除' : '全選択'}</Text>
            </TouchableOpacity>
            <Text style={styles.toolbarCount}>{selected.size}件選択中</Text>
            <TouchableOpacity onPress={exitSelect}>
              <Text style={styles.toolbarBtn}>完了</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.toolbarTitle}>記録の履歴</Text>
            <TouchableOpacity onPress={() => setSelectMode(true)} disabled={allIds.length === 0}>
              <Text style={[styles.toolbarBtn, allIds.length === 0 && styles.toolbarBtnDisabled]}>
                選択して削除
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SetRow
            set={item}
            selectable={selectMode}
            selected={selected.has(item.id)}
            onToggle={toggle}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{dateLabel(section.title)}</Text>
            <Text style={styles.sectionHeaderCount}>{section.data.length}セット</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>まだ記録がありません。記録タブから始めましょう</Text>
        }
        stickySectionHeadersEnabled
        contentContainerStyle={selectMode ? styles.listPadded : undefined}
      />

      {/* 削除バー */}
      {selectMode && (
        <TouchableOpacity
          style={[styles.deleteBar, selected.size === 0 && styles.deleteBarDisabled]}
          onPress={handleBulkDelete}
          disabled={selected.size === 0}
        >
          <Text style={styles.deleteBarText}>
            {selected.size > 0 ? `${selected.size}件を削除` : '削除する記録を選択'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toolbarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  toolbarBtn: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  toolbarBtnDisabled: {
    color: colors.textMuted,
  },
  toolbarCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHeaderCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 48,
    fontSize: 15,
  },
  listPadded: {
    paddingBottom: 80,
  },
  deleteBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBarDisabled: {
    backgroundColor: colors.textMuted,
  },
  deleteBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
