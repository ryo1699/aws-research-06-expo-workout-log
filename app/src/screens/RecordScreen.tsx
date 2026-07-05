import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  addExercise,
  deleteExercise,
  deleteSet,
  getExercises,
  getLastSetForExercise,
  getTodaySets,
  insertSet,
} from '../db';
import { type Category, type Exercise, type WorkoutSet } from '../types';
import { weightLabel } from '../format';
import { ExercisePicker } from '../components/ExercisePicker';
import { RestTimer } from '../components/RestTimer';
import { SetRow } from '../components/SetRow';
import { colors } from '../theme';

export function RecordScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercise, setExercise] = useState<string>('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [memo, setMemo] = useState('');
  const [todaySets, setTodaySets] = useState<WorkoutSet[]>([]);
  const [lastSet, setLastSet] = useState<WorkoutSet | null>(null);

  const reloadExercises = useCallback(async () => {
    const list = await getExercises(db);
    setExercises(list);
    setExercise((cur) => (cur && list.some((e) => e.name === cur) ? cur : (list[0]?.name ?? '')));
  }, [db]);

  useEffect(() => {
    reloadExercises();
    getTodaySets(db).then(setTodaySets);
  }, [db, reloadExercises]);

  // 種目を切り替えたら前回記録を取得
  useEffect(() => {
    if (!exercise) {
      setLastSet(null);
      return;
    }
    getLastSetForExercise(db, exercise).then(setLastSet);
  }, [db, exercise]);

  const handleRecord = useCallback(async () => {
    const weightValue = weight.trim() === '' ? 0 : Number(weight);
    const repsValue = Number(reps);
    if (!exercise) {
      Alert.alert('種目がありません', '先に種目を追加してください');
      return;
    }
    if (!Number.isFinite(weightValue) || weightValue < 0) {
      Alert.alert('入力エラー', '重量は 0 以上の数値で入力してください(自重は空欄でOK)');
      return;
    }
    if (!Number.isInteger(repsValue) || repsValue < 1) {
      Alert.alert('入力エラー', '回数は 1 以上の整数で入力してください');
      return;
    }
    const memoValue = memo.trim() === '' ? null : memo.trim();
    const saved = await insertSet(db, exercise, weightValue, repsValue, memoValue);
    setTodaySets((prev) => [saved, ...prev]);
    setLastSet(saved);
    setMemo('');
    Keyboard.dismiss();
  }, [db, exercise, weight, reps, memo]);

  const copyLastSet = useCallback(() => {
    if (!lastSet) return;
    setWeight(lastSet.weight === 0 ? '' : String(lastSet.weight));
    setReps(String(lastSet.reps));
  }, [lastSet]);

  const handleDelete = useCallback(
    (set: WorkoutSet) => {
      Alert.alert('削除', `${set.exercise} の記録を削除しますか?`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await deleteSet(db, set.id);
            setTodaySets((prev) => prev.filter((s) => s.id !== set.id));
          },
        },
      ]);
    },
    [db],
  );

  const handleAddExercise = useCallback(
    (category: Category) => {
      Alert.prompt?.(
        `種目を追加 (${category})`,
        '種目名を入力してください',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '追加',
            onPress: async (name?: string) => {
              const trimmed = name?.trim();
              if (!trimmed) return;
              try {
                await addExercise(db, trimmed, category);
                await reloadExercises();
                setExercise(trimmed);
              } catch {
                Alert.alert('追加できません', '同じ名前の種目がすでにあります');
              }
            },
          },
        ],
        'plain-text',
      );
    },
    [db, reloadExercises],
  );

  const handleDeleteExercise = useCallback(
    (target: Exercise) => {
      Alert.alert('種目を削除', `「${target.name}」を種目リストから削除しますか?(記録済みのデータは残ります)`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await deleteExercise(db, target.id);
            await reloadExercises();
          },
        },
      ]);
    },
    [db, reloadExercises],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={todaySets}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <SetRow set={item} onDelete={handleDelete} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <ExercisePicker
              exercises={exercises}
              selected={exercise}
              onSelect={setExercise}
              onAdd={handleAddExercise}
              onDelete={handleDeleteExercise}
            />

            {lastSet && (
              <TouchableOpacity style={styles.lastSet} onPress={copyLastSet}>
                <Text style={styles.lastSetText}>
                  前回: {weightLabel(lastSet.weight)} × {lastSet.reps}回
                </Text>
                <Text style={styles.lastSetCopy}>タップでコピー</Text>
              </TouchableOpacity>
            )}

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>重量 (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="自重は空欄"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>回数</Text>
                <TextInput
                  style={styles.input}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.memoGroup}>
              <Text style={styles.inputLabel}>メモ (任意)</Text>
              <TextInput
                style={styles.input}
                value={memo}
                onChangeText={setMemo}
                placeholder="調子・フォームなど"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.recordButton} onPress={handleRecord}>
              <Text style={styles.recordButtonText}>セットを記録</Text>
            </TouchableOpacity>

            <RestTimer />

            <Text style={styles.sectionTitle}>今日の記録 ({todaySets.length}セット)</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>まだ記録がありません。今日も頑張りましょう💪</Text>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  lastSet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
  },
  lastSetText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  lastSetCopy: {
    fontSize: 12,
    color: colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  inputGroup: {
    flex: 1,
  },
  memoGroup: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.backgroundMuted,
  },
  recordButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 32,
    fontSize: 15,
  },
});
