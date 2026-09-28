// src/services/database.ts
import * as SQLite from 'expo-sqlite';
import {
  Task,
  MoodEntry,
  ExerciseSession,
  UserProfile,
  DyslexiaTestType,
  TestItem,
  TestAttempt,
  ItemResponse,
  RemedialExercise,
  RiskBand,
  CognitiveMarker,
  MarkerBreakdown,
} from '../constants/types';
import { TEST_ITEMS } from '../constants/dyslexiaTests';
import { getCurrentUserId } from './authService';
import { isSupabaseConfigured } from './supabase';

let db: SQLite.SQLiteDatabase;

/**
 * Races any promise against a timeout, so a stuck/hung database call fails
 * loudly after a few seconds instead of leaving a UI spinner stuck forever.
 * This is a safety net, not a fix for the underlying cause — if this ever
 * fires, check the console for what actually hung.
 */
const withTimeout = <T,>(promise: Promise<T>, ms = 8000, label = 'operation'): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

export const initDatabase = async (): Promise<void> => {
  // Using a new filename here (not 'cognicare.db') is deliberate: some
  // devices ended up with a corrupted/locked local database after an
  // earlier schema change, which caused writes to hang indefinitely rather
  // than error out. A fresh filename guarantees every device starts from
  // a clean SQLite file, sidestepping that entirely. Any local-only data in
  // the old file (already-synced test attempts, profile info) is not
  // migrated, but Supabase remains the source of truth for synced data.
  db = await SQLite.openDatabaseAsync('cognicare_v2.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      diagnosis_type TEXT,
      onboarding_complete INTEGER DEFAULT 0,
      notifications_enabled INTEGER DEFAULT 1,
      location_enabled INTEGER DEFAULT 0,
      preferred_language TEXT DEFAULT 'en',
      daily_goal_tasks INTEGER DEFAULT 5,
      daily_goal_exercises INTEGER DEFAULT 3,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      scheduled_time TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      is_recurring INTEGER DEFAULT 0,
      recurring_days TEXT,
      category TEXT DEFAULT 'other',
      priority TEXT DEFAULT 'medium',
      reminder_minutes INTEGER DEFAULT 10,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      mood INTEGER NOT NULL,
      energy INTEGER NOT NULL,
      notes TEXT,
      factors TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exercise_sessions (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 100,
      accuracy REAL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      actionable TEXT,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      dismissed INTEGER DEFAULT 0
    );

    -- ── Dyslexia Screening (see ERD: Entity Relationship Diagram slide) ──

    CREATE TABLE IF NOT EXISTS test_items (
      id TEXT PRIMARY KEY,
      test_type TEXT NOT NULL,
      marker TEXT NOT NULL,
      stimulus TEXT,
      stimulus_display_ms INTEGER,
      prompt TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id TEXT PRIMARY KEY,
      test_type TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      raw_score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      risk_band TEXT,
      duration_seconds INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS item_responses (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES test_attempts(id),
      item_id TEXT NOT NULL REFERENCES test_items(id),
      student_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      response_time_ms INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS remedial_exercises (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES test_attempts(id),
      marker TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT 'ai'
    );
  `);

  // Defensive migration for anyone who installed before the `synced` column
  // existed. "ADD COLUMN IF NOT EXISTS" isn't supported by every SQLite
  // build expo-sqlite ships, so check via PRAGMA first instead.
  try {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(test_attempts);`);
    const hasSynced = cols.some(c => c.name === 'synced');
    if (!hasSynced) {
      await db.execAsync(`ALTER TABLE test_attempts ADD COLUMN synced INTEGER DEFAULT 0;`);
    }
  } catch (e) {
    console.warn('synced column migration skipped:', e);
  }

  // Defensive migration for anyone who installed before caregiver_name/
  // caregiver_contact were renamed to emergency_contact_name/
  // emergency_contact_phone. Without this, an existing on-device database
  // still has the old column names (CREATE TABLE IF NOT EXISTS never
  // updates an existing table), so every upsertUser() call throws
  // "no such column: emergency_contact_name" and silently hangs any
  // screen that doesn't catch it.
  try {
    const userCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(users);`);
    const names = userCols.map(c => c.name);

    if (names.includes('caregiver_name') && !names.includes('emergency_contact_name')) {
      await db.execAsync(`ALTER TABLE users RENAME COLUMN caregiver_name TO emergency_contact_name;`);
    } else if (!names.includes('emergency_contact_name')) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN emergency_contact_name TEXT;`);
    }

    if (names.includes('caregiver_contact') && !names.includes('emergency_contact_phone')) {
      await db.execAsync(`ALTER TABLE users RENAME COLUMN caregiver_contact TO emergency_contact_phone;`);
    } else if (!names.includes('emergency_contact_phone')) {
      await db.execAsync(`ALTER TABLE users ADD COLUMN emergency_contact_phone TEXT;`);
    }
  } catch (e) {
    console.warn('emergency_contact column migration skipped:', e);
  }

  await seedTestItems();
};

// ── Dyslexia Screening: seed static item bank ───────────────────────────
// Idempotent — safe to call on every launch. Content lives in
// constants/dyslexiaTests.ts, so updating the item bank never needs a
// migration, just a new seed row.

const seedTestItems = async (): Promise<void> => {
  for (const item of TEST_ITEMS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO test_items
        (id, test_type, marker, stimulus, stimulus_display_ms, prompt, options, correct_answer, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.testType,
        item.marker,
        item.stimulus ?? null,
        item.stimulusDisplayMs ?? null,
        item.prompt,
        JSON.stringify(item.options),
        item.correctAnswer,
        item.orderIndex,
      ]
    );
  }
};

// ── Dyslexia Screening: Test Attempts ────────────────────────────────────

export const insertTestAttempt = async (attempt: TestAttempt): Promise<void> => {
  await db.runAsync(
    `INSERT INTO test_attempts (id, test_type, started_at, completed_at, raw_score, max_score, accuracy, risk_band, duration_seconds, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attempt.id,
      attempt.testType,
      attempt.startedAt.toISOString(),
      attempt.completedAt?.toISOString() ?? null,
      attempt.rawScore,
      attempt.maxScore,
      attempt.accuracy,
      attempt.riskBand ?? null,
      attempt.durationSeconds,
      attempt.synced ? 1 : 0,
    ]
  );
};

export const markAttemptSynced = async (id: string): Promise<void> => {
  await db.runAsync(`UPDATE test_attempts SET synced = 1 WHERE id = ?`, [id]);
};

export const getUnsyncedAttempts = async (): Promise<TestAttempt[]> => {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM test_attempts WHERE synced = 0 OR synced IS NULL ORDER BY started_at ASC`
  );
  return rows.map(rowToAttempt);
};

export const getResponsesForAttempt = async (attemptId: string): Promise<ItemResponse[]> => {
  const rows = await db.getAllAsync<any>(`SELECT * FROM item_responses WHERE attempt_id = ?`, [
    attemptId,
  ]);
  return rows.map(rowToItemResponse);
};

export const insertItemResponse = async (response: ItemResponse): Promise<void> => {
  await db.runAsync(
    `INSERT INTO item_responses (id, attempt_id, item_id, student_answer, is_correct, response_time_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      response.id,
      response.attemptId,
      response.itemId,
      response.studentAnswer,
      response.isCorrect ? 1 : 0,
      response.responseTimeMs,
    ]
  );
};

export const getAttemptsForTest = async (
  testType: DyslexiaTestType,
  limit = 20
): Promise<TestAttempt[]> => {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM test_attempts WHERE test_type = ? ORDER BY started_at DESC LIMIT ?`,
    [testType, limit]
  );
  return rows.map(rowToAttempt);
};

export const getAttemptById = async (id: string): Promise<TestAttempt | null> => {
  const row = await db.getFirstAsync<any>(`SELECT * FROM test_attempts WHERE id = ?`, [id]);
  return row ? rowToAttempt(row) : null;
};

export const getAllAttempts = async (limit = 50): Promise<TestAttempt[]> => {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM test_attempts ORDER BY started_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map(rowToAttempt);
};

export const getMarkerBreakdown = async (attemptId: string): Promise<MarkerBreakdown[]> => {
  const rows = await db.getAllAsync<any>(
    `SELECT ti.marker as marker,
            SUM(ir.is_correct) as correct,
            COUNT(*) as total
     FROM item_responses ir
     JOIN test_items ti ON ti.id = ir.item_id
     WHERE ir.attempt_id = ?
     GROUP BY ti.marker`,
    [attemptId]
  );
  return rows.map(r => ({
    marker: r.marker as CognitiveMarker,
    correct: r.correct,
    total: r.total,
  }));
};

export const insertRemedialExercise = async (ex: RemedialExercise): Promise<void> => {
  await db.runAsync(
    `INSERT INTO remedial_exercises (id, attempt_id, marker, content, generated_at, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ex.id, ex.attemptId, ex.marker, ex.content, ex.generatedAt.toISOString(), ex.source]
  );
};

export const getRemedialExercisesForAttempt = async (
  attemptId: string
): Promise<RemedialExercise[]> => {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM remedial_exercises WHERE attempt_id = ? ORDER BY generated_at ASC`,
    [attemptId]
  );
  return rows.map(rowToRemedialExercise);
};

/** Aggregated counts by risk band — the local-device basis for the Disability Unit reporting view. */
export const getRiskBandCounts = async (): Promise<Record<RiskBand, number>> => {
  const rows = await db.getAllAsync<any>(
    `SELECT risk_band, COUNT(*) as n FROM test_attempts WHERE risk_band IS NOT NULL GROUP BY risk_band`
  );
  const counts: Record<RiskBand, number> = { low: 0, moderate: 0, high: 0 };
  rows.forEach(r => {
    if (r.risk_band in counts) counts[r.risk_band as RiskBand] = r.n;
  });
  return counts;
};

// ── Tasks ──────────────────────────────────────────────────────────────────

export const getTodaysTasks = async (): Promise<Task[]> => {
  const today = new Date().toISOString().split('T')[0];
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM tasks WHERE date(scheduled_time) = ? ORDER BY scheduled_time ASC`,
    [today]
  );
  return rows.map(rowToTask);
};

export const getAllTasks = async (): Promise<Task[]> => {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM tasks ORDER BY scheduled_time DESC LIMIT 100`
  );
  return rows.map(rowToTask);
};

export const insertTask = async (task: Task): Promise<void> => {
  await db.runAsync(
    `INSERT INTO tasks (id, title, description, scheduled_time, is_completed, is_recurring, recurring_days, category, priority, reminder_minutes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.description ?? null,
      task.scheduledTime.toISOString(),
      task.isCompleted ? 1 : 0,
      task.isRecurring ? 1 : 0,
      task.recurringDays ? JSON.stringify(task.recurringDays) : null,
      task.category,
      task.priority,
      task.reminderMinutes,
      task.createdAt.toISOString(),
    ]
  );
};

export const updateTaskCompletion = async (id: string, completed: boolean): Promise<void> => {
  await db.runAsync(`UPDATE tasks SET is_completed = ?, completed_at = ? WHERE id = ?`, [
    completed ? 1 : 0,
    completed ? new Date().toISOString() : null,
    id,
  ]);
};

export const deleteTask = async (id: string): Promise<void> => {
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
};

// ── Mood ──────────────────────────────────────────────────────────────────

export const getMoodEntries = async (days = 7): Promise<MoodEntry[]> => {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM mood_entries WHERE created_at >= ? ORDER BY date DESC`,
    [since]
  );
  return rows.map(rowToMood);
};

export const insertMoodEntry = async (entry: MoodEntry): Promise<void> => {
  await db.runAsync(
    `INSERT INTO mood_entries (id, date, mood, energy, notes, factors) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.date.toISOString(),
      entry.mood,
      entry.energy,
      entry.notes ?? null,
      entry.factors ? JSON.stringify(entry.factors) : null,
    ]
  );
};

// ── Exercise Sessions ──────────────────────────────────────────────────────

export const getExerciseSessions = async (days = 30): Promise<ExerciseSession[]> => {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM exercise_sessions WHERE started_at >= ? ORDER BY started_at DESC`,
    [since]
  );
  return rows.map(rowToSession);
};

export const insertExerciseSession = async (session: ExerciseSession): Promise<void> => {
  await db.runAsync(
    `INSERT INTO exercise_sessions (id, exercise_id, started_at, completed_at, score, max_score, accuracy, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.exerciseId,
      session.startedAt.toISOString(),
      session.completedAt?.toISOString() ?? null,
      session.score,
      session.maxScore,
      session.accuracy,
      session.durationSeconds,
    ]
  );
};

// ── User ──────────────────────────────────────────────────────────────────

export const getUser = async (): Promise<UserProfile | null> => {
  // Scoped to the currently signed-in Supabase user — without this, on a
  // shared device the app would show whichever profile happened to be
  // saved locally first, regardless of who's actually logged in.
  let row: any;
  if (isSupabaseConfigured) {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    row = await db.getFirstAsync<any>(`SELECT * FROM users WHERE id = ?`, [userId]);
  } else {
    // Local-only mode (no backend configured) has no accounts — one profile.
    row = await db.getFirstAsync<any>(`SELECT * FROM users LIMIT 1`);
  }
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    diagnosisType: row.diagnosis_type,
    onboardingComplete: !!row.onboarding_complete,
    notificationsEnabled: !!row.notifications_enabled,
    locationEnabled: !!row.location_enabled,
    preferredLanguage: row.preferred_language,
    dailyGoalTasks: row.daily_goal_tasks,
    dailyGoalExercises: row.daily_goal_exercises,
  };
};

export const upsertUser = async (user: UserProfile): Promise<void> => {
  await withTimeout(
    db.runAsync(
      `INSERT OR REPLACE INTO users (id, name, age, emergency_contact_name, emergency_contact_phone, diagnosis_type,
        onboarding_complete, notifications_enabled, location_enabled, preferred_language,
        daily_goal_tasks, daily_goal_exercises)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.age ?? null,
        user.emergencyContactName ?? null,
        user.emergencyContactPhone ?? null,
        user.diagnosisType ?? null,
        user.onboardingComplete ? 1 : 0,
        user.notificationsEnabled ? 1 : 0,
        user.locationEnabled ? 1 : 0,
        user.preferredLanguage,
        user.dailyGoalTasks,
        user.dailyGoalExercises,
      ]
    ),
    8000,
    'upsertUser'
  );
};

// ── Row mappers ───────────────────────────────────────────────────────────

const rowToTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  scheduledTime: new Date(row.scheduled_time),
  isCompleted: !!row.is_completed,
  isRecurring: !!row.is_recurring,
  recurringDays: row.recurring_days ? JSON.parse(row.recurring_days) : undefined,
  category: row.category,
  priority: row.priority,
  reminderMinutes: row.reminder_minutes,
  createdAt: new Date(row.created_at),
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
});

const rowToMood = (row: any): MoodEntry => ({
  id: row.id,
  date: new Date(row.date),
  mood: row.mood,
  energy: row.energy,
  notes: row.notes,
  factors: row.factors ? JSON.parse(row.factors) : undefined,
});

const rowToSession = (row: any): ExerciseSession => ({
  id: row.id,
  exerciseId: row.exercise_id,
  startedAt: new Date(row.started_at),
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  score: row.score,
  maxScore: row.max_score,
  accuracy: row.accuracy,
  durationSeconds: row.duration_seconds,
});

const rowToAttempt = (row: any): TestAttempt => ({
  id: row.id,
  testType: row.test_type,
  startedAt: new Date(row.started_at),
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  rawScore: row.raw_score,
  maxScore: row.max_score,
  accuracy: row.accuracy,
  riskBand: row.risk_band ?? undefined,
  durationSeconds: row.duration_seconds,
  synced: !!row.synced,
});

const rowToItemResponse = (row: any): ItemResponse => ({
  id: row.id,
  attemptId: row.attempt_id,
  itemId: row.item_id,
  studentAnswer: row.student_answer,
  isCorrect: !!row.is_correct,
  responseTimeMs: row.response_time_ms,
});

const rowToRemedialExercise = (row: any): RemedialExercise => ({
  id: row.id,
  attemptId: row.attempt_id,
  marker: row.marker,
  content: row.content,
  generatedAt: new Date(row.generated_at),
  source: row.source,
});
