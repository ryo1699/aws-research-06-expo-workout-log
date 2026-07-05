import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, getStats, setSetting } from '../db';
import { computeProgress, encourageMessage, evolveMessage, type Progress } from '../avatar';
import { type WorkoutStats } from '../types';
import { PixelCreature } from '../components/PixelCreature';
import { colors } from '../theme';

const SEEN_STAGE_KEY = 'seen_global_stage';

export function HomeScreen() {
  const db = useSQLiteContext();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stats, setStats] = useState<WorkoutStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const s = await getStats(db);
        const p = computeProgress(s);
        if (!active) return;
        setStats(s);
        setProgress(p);

        // 進化演出: 前回見た通し段階より進んでいたらお祝い
        const seenRaw = await getSetting(db, SEEN_STAGE_KEY);
        const seen = seenRaw === null ? -1 : Number(seenRaw);
        if (p.globalStageId > seen) {
          if (seen >= 0) Alert.alert('成長!', evolveMessage(p));
          await setSetting(db, SEEN_STAGE_KEY, String(p.globalStageId));
        } else if (p.globalStageId < seen) {
          await setSetting(db, SEEN_STAGE_KEY, String(p.globalStageId));
        }
      })();
      return () => {
        active = false;
      };
    }, [db]),
  );

  if (!progress || !stats) return <View style={styles.container} />;

  const todayDone = stats.todayHasWorkout;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatarCard}>
        <View style={styles.stageBadge}>
          <Text style={styles.stageBadgeText}>{progress.stageName}</Text>
        </View>
        <View style={styles.spriteBox}>
          <PixelCreature creatureKey={progress.creature.key} stage={progress.stage} pixel={6} />
        </View>
        <Text style={styles.name}>{progress.creature.name}</Text>
        <Text style={styles.collectionText}>
          コレクション {progress.completedCount} / {progress.totalCreatures}
        </Text>
      </View>

      {/* 成長度 */}
      <View style={styles.progressCard}>
        {progress.allComplete ? (
          <Text style={styles.maxText}>全10種をコンプリート! 🎉 真の継続者だ。</Text>
        ) : (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {progress.stageIndex < 2
                  ? `次の段階まで`
                  : `${progress.creature.name}は成体! 次の卵まで`}
              </Text>
              <Text style={styles.progressRemain}>
                あと {progress.remainingToNext}
                {progress.metricLabel}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${progress.creatureProgress * 100}%` }]} />
            </View>
            <Text style={styles.stageStepper}>卵 → 幼体 → 成体</Text>
          </>
        )}
      </View>

      {/* ステータス */}
      <View style={styles.statsRow}>
        <StatBox label="累計セット" value={String(stats.totalSets)} />
        <StatBox label="連続記録" value={`${stats.currentStreak}日`} />
        <StatBox label="トレ日数" value={`${stats.totalDays}日`} />
      </View>

      {/* ひとこと */}
      <View style={styles.speech}>
        <Text style={styles.speechText}>
          {todayDone ? '今日もお疲れさま! この調子だよ。' : encourageMessage(progress)}
        </Text>
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  avatarCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
  },
  stageBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stageBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  spriteBox: {
    height: 32 * 6 + 8,
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  collectionText: {
    fontSize: 13,
    color: colors.accent,
    marginTop: 2,
    fontWeight: '600',
  },
  progressCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.backgroundMuted,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  progressRemain: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  stageStepper: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  maxText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  speech: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speechText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
});
