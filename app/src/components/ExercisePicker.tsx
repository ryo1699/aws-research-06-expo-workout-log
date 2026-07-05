import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { CATEGORIES } from '../exercises';
import { type Exercise, type Category } from '../types';
import { colors } from '../theme';

type Props = {
  exercises: Exercise[];
  selected: string;
  onSelect: (exercise: string) => void;
  onAdd: (category: Category) => void;
  onDelete: (exercise: Exercise) => void;
};

export function ExercisePicker({ exercises, selected, onSelect, onAdd, onDelete }: Props) {
  const selectedCategory = exercises.find((e) => e.name === selected)?.category ?? CATEGORIES[0];
  const [category, setCategory] = useState<Category>(selectedCategory);

  const shown = exercises.filter((e) => e.category === category);

  return (
    <View>
      {/* 部位カテゴリ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.catText, active && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 種目 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {shown.map((exercise) => {
          const active = exercise.name === selected;
          return (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(exercise.name)}
              onLongPress={() => onDelete(exercise)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {exercise.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.addChip} onPress={() => onAdd(category)}>
          <Text style={styles.addText}>＋追加</Text>
        </TouchableOpacity>
      </ScrollView>
      <Text style={styles.hint}>長押しで種目を削除</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundMuted,
  },
  catChipActive: {
    backgroundColor: colors.accentSoft,
  },
  catText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  catTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  container: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 15,
    color: colors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.background,
  },
  addText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
});
