import { type WorkoutStats } from './types';
import { CREATURES, STAGE_KEYS, type Creature, type Stage } from './creatures';

/**
 * 育成ロジック(コレクション制)。
 * 1体ずつ「卵 → 幼体 → 成体」の3段階で育て、成体になったら次の生き物の卵に進む。
 * 育て切った生き物はコレクションに加わる。
 *
 * - GROWTH_MODE 'sets': 累計セット数で進行(デバッグ超速)。SETS_PER_STAGE ごとに1段階進む。
 * - GROWTH_MODE 'days': トレーニング日数で進行(実用)。
 * 実用に切り替えるときは MODE を 'days' に、SETS_PER_STAGE を大きく(例:3)する。
 */
export const GROWTH_MODE: 'sets' | 'days' = 'sets';
export const SETS_PER_STAGE = 1; // 1段階進むのに必要な指標量(デバッグ超速)
export const STAGES_PER_CREATURE = 3; // 卵・幼体・成体

export const STAGE_NAMES = ['卵', '幼体', '成体'] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export type Progress = {
  creature: Creature;
  creatureIndex: number;
  stageIndex: number; // 0=卵 1=幼体 2=成体
  stageName: StageName;
  stage: Stage; // 'egg' | 'baby' | 'adult'
  completedCount: number; // 育て切った数(コレクション数)
  totalCreatures: number;
  metric: number;
  metricLabel: string;
  remainingToNext: number; // 次の段階まであと何セット/日
  creatureProgress: number; // この生き物の成長度 0..1
  allComplete: boolean;
  globalStageId: number; // 進化検出用の通し番号
};

export function computeProgress(stats: WorkoutStats): Progress {
  const metric = GROWTH_MODE === 'sets' ? stats.totalSets : stats.totalDays;
  const metricLabel = GROWTH_MODE === 'sets' ? 'セット' : '日';
  const perCreature = SETS_PER_STAGE * STAGES_PER_CREATURE;
  const total = CREATURES.length;

  let creatureIndex = Math.floor(metric / perCreature);
  let within = metric % perCreature; // 現在の生き物の中での進み(0..perCreature-1)
  let allComplete = false;

  if (creatureIndex >= total) {
    creatureIndex = total - 1;
    within = perCreature; // 最終形をカンスト表示
    allComplete = true;
  }

  const stageIndex = allComplete
    ? STAGES_PER_CREATURE - 1
    : Math.floor(within / SETS_PER_STAGE);
  const intoStage = within % SETS_PER_STAGE;
  const remainingToNext = allComplete ? 0 : SETS_PER_STAGE - intoStage;
  const creatureProgress = Math.min(1, within / perCreature);
  const completedCount = allComplete ? total : creatureIndex;

  const creature = CREATURES[creatureIndex];

  return {
    creature,
    creatureIndex,
    stageIndex,
    stageName: STAGE_NAMES[stageIndex],
    stage: STAGE_KEYS[stageIndex],
    completedCount,
    totalCreatures: total,
    metric,
    metricLabel,
    remainingToNext,
    creatureProgress,
    allComplete,
    globalStageId: creatureIndex * STAGES_PER_CREATURE + stageIndex,
  };
}

/** アバターが筋トレを促すセリフ */
export function encourageMessage(p: Progress): string {
  const c = p.creature;
  if (p.stageIndex === 0) return `${c.name}のたまごが、あたたかさを待っている…。今日のトレーニングで孵そう!`;
  if (p.stageIndex === 1) return `${c.name}(幼体)が「はやく強くなりたい!」と見上げている。いっしょに鍛えよう!`;
  return `${c.name}が「今日も頼むぞ、相棒」と待っている。さあトレーニングだ!`;
}

/** 段階が進んだときのお祝いメッセージ */
export function evolveMessage(p: Progress): string {
  const c = p.creature;
  if (p.stageIndex === 0) return `新しいたまごが届いた! 今度は「${c.name}」を育てよう🥚`;
  if (p.stageIndex === 1) return `${c.name}が幼体に孵化した!`;
  return `${c.name}が成体に成長した! コレクションに加わったよ✨`;
}
