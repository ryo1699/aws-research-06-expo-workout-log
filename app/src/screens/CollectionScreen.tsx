import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getStats } from '../db';
import { computeProgress } from '../avatar';
import { CREATURES, type Stage } from '../creatures';
import { PixelCreature } from '../components/PixelCreature';
import { colors } from '../theme';

type CardState = 'done' | 'current' | 'locked';

export function CollectionScreen() {
  const db = useSQLiteContext();
  const [creatureIndex, setCreatureIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [currentStage, setCurrentStage] = useState<Stage>('egg');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getStats(db).then((s) => {
        if (!active) return;
        const p = computeProgress(s);
        setCreatureIndex(p.creatureIndex);
        setCompletedCount(p.completedCount);
        setCurrentStage(p.stage);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        育てた仲間 {completedCount} / {CREATURES.length}
      </Text>
      <View style={styles.grid}>
        {CREATURES.map((c, i) => {
          const state: CardState =
            i < completedCount ? 'done' : i === creatureIndex ? 'current' : 'locked';
          return (
            <View key={c.key} style={styles.card}>
              <View style={styles.spriteBox}>
                {state === 'locked' ? (
                  <Text style={styles.lockMark}>？</Text>
                ) : (
                  <PixelCreature
                    creatureKey={c.key}
                    stage={state === 'current' ? currentStage : 'adult'}
                    pixel={3}
                    animate={state === 'current'}
                  />
                )}
              </View>
              <Text style={styles.cardName}>
                {state === 'locked' ? '？？？' : c.name}
              </Text>
              {state === 'current' && <Text style={styles.badge}>育成中</Text>}
              {state === 'done' && <Text style={[styles.badge, styles.badgeDone]}>コンプ</Text>}
              {state !== 'locked' && <Text style={styles.intro}>{c.intro}</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.backgroundMuted,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  spriteBox: {
    height: 32 * 3 + 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockMark: {
    fontSize: 40,
    color: colors.textMuted,
    fontWeight: '800',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  badge: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeDone: {
    color: colors.text,
  },
  intro: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 15,
  },
});
