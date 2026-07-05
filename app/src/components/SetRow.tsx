import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type WorkoutSet } from '../types';
import { localTime, weightLabel } from '../format';
import { colors } from '../theme';

type Props = {
  set: WorkoutSet;
  onDelete?: (set: WorkoutSet) => void;
  // 複数選択モード
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (set: WorkoutSet) => void;
};

export function SetRow({ set, onDelete, selectable, selected, onToggle }: Props) {
  const content = (
    <>
      {selectable && (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected && <Text style={styles.checkMark}>✓</Text>}
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.exercise}>{set.exercise}</Text>
        <Text style={styles.detail}>
          {weightLabel(set.weight)} × {set.reps}回
          <Text style={styles.time}>  {localTime(set.performed_at)}</Text>
        </Text>
        {set.memo ? <Text style={styles.memo}>📝 {set.memo}</Text> : null}
      </View>
      {onDelete && !selectable && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(set)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteText}>削除</Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (selectable) {
    return (
      <TouchableOpacity style={styles.row} onPress={() => onToggle?.(set)} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  exercise: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  detail: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
  },
  memo: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.backgroundMuted,
  },
  deleteText: {
    fontSize: 13,
    color: colors.danger,
  },
});
