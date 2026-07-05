export type WorkoutSet = {
  id: number;
  exercise: string;
  weight: number; // kg。自重種目は 0
  reps: number;
  performed_at: string; // ISO 8601 (UTC)
  memo: string | null;
};

/** 部位カテゴリ */
export type Category = '胸' | '背中' | '脚' | '肩' | '腕' | '体幹';

export type Exercise = {
  id: number;
  name: string;
  category: Category;
  sort_order: number;
  is_builtin: number; // 1 = 初期種目(削除しても再投入されない). 0 = ユーザー追加
};

/** アバター育成の集計値 */
export type WorkoutStats = {
  totalSets: number; // 累計セット数
  totalDays: number; // トレーニングした日数(重複なし)
  currentStreak: number; // 連続記録日数
  todayHasWorkout: boolean; // 今日すでに記録したか
};
