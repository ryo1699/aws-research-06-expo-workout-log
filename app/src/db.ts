import { type SQLiteDatabase } from 'expo-sqlite';
import { type WorkoutSet, type Exercise, type Category, type WorkoutStats } from './types';
import { SEED_EXERCISES } from './exercises';
import { localDateKey } from './format';

export const DATABASE_NAME = 'workout-log.db';

const LATEST_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    // v1: 初期スキーマ(セット記録)
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise TEXT NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        performed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sets_performed_at ON sets (performed_at);
    `);
    version = 1;
  }

  if (version < 2) {
    // v2: メモ欄・種目マスタ・設定テーブルを追加
    await db.execAsync(`
      ALTER TABLE sets ADD COLUMN memo TEXT;
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    // 初期種目を投入
    for (let i = 0; i < SEED_EXERCISES.length; i++) {
      const e = SEED_EXERCISES[i];
      await db.runAsync(
        'INSERT OR IGNORE INTO exercises (name, category, sort_order, is_builtin) VALUES (?, ?, ?, 1)',
        e.name,
        e.category,
        i,
      );
    }
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${LATEST_VERSION}`);
}

// ---------- セット記録 ----------

export async function insertSet(
  db: SQLiteDatabase,
  exercise: string,
  weight: number,
  reps: number,
  memo: string | null = null,
): Promise<WorkoutSet> {
  const performedAt = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO sets (exercise, weight, reps, performed_at, memo) VALUES (?, ?, ?, ?, ?)',
    exercise,
    weight,
    reps,
    performedAt,
    memo,
  );
  return { id: result.lastInsertRowId, exercise, weight, reps, performed_at: performedAt, memo };
}

export async function deleteSet(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM sets WHERE id = ?', id);
}

/** 複数のセットをまとめて削除する */
export async function deleteSets(db: SQLiteDatabase, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM sets WHERE id IN (${placeholders})`, ...ids);
}

/** 端末ローカル時間での「今日」の記録を新しい順に返す */
export async function getTodaySets(db: SQLiteDatabase): Promise<WorkoutSet[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return db.getAllAsync<WorkoutSet>(
    'SELECT * FROM sets WHERE performed_at >= ? ORDER BY performed_at DESC',
    startOfToday.toISOString(),
  );
}

export async function getAllSets(db: SQLiteDatabase): Promise<WorkoutSet[]> {
  return db.getAllAsync<WorkoutSet>('SELECT * FROM sets ORDER BY performed_at DESC');
}

/** 指定種目の直近1セット(前回コピー用)。無ければ null */
export async function getLastSetForExercise(
  db: SQLiteDatabase,
  exercise: string,
): Promise<WorkoutSet | null> {
  const row = await db.getFirstAsync<WorkoutSet>(
    'SELECT * FROM sets WHERE exercise = ? ORDER BY performed_at DESC LIMIT 1',
    exercise,
  );
  return row ?? null;
}

// ---------- 種目マスタ ----------

export async function getExercises(db: SQLiteDatabase): Promise<Exercise[]> {
  return db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY sort_order ASC, id ASC');
}

export async function addExercise(
  db: SQLiteDatabase,
  name: string,
  category: Category,
): Promise<void> {
  const row = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(sort_order) as max FROM exercises',
  );
  const nextOrder = (row?.max ?? -1) + 1;
  await db.runAsync(
    'INSERT INTO exercises (name, category, sort_order, is_builtin) VALUES (?, ?, ?, 0)',
    name,
    category,
    nextOrder,
  );
}

export async function deleteExercise(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', id);
}

// ---------- 統計(アバター育成用) ----------

function dateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getStats(db: SQLiteDatabase): Promise<WorkoutStats> {
  const rows = await db.getAllAsync<{ performed_at: string }>('SELECT performed_at FROM sets');
  const totalSets = rows.length;
  const dayKeys = new Set(rows.map((r) => localDateKey(r.performed_at)));
  const totalDays = dayKeys.size;

  const todayKey = dateKeyFromDate(new Date());
  const todayHasWorkout = dayKeys.has(todayKey);

  // 連続記録: 今日(なければ昨日)から遡って連続している日数を数える
  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!todayHasWorkout) cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(dateKeyFromDate(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { totalSets, totalDays, currentStreak, todayHasWorkout };
}

// ---------- 設定 ----------

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
