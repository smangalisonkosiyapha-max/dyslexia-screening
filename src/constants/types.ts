// src/constants/types.ts

export interface Task {
  id: string;
  title: string;
  description?: string;
  scheduledTime: Date;
  isCompleted: boolean;
  isRecurring: boolean;
  recurringDays?: number[]; // 0=Sun, 1=Mon, ...
  category: TaskCategory;
  priority: 'low' | 'medium' | 'high';
  reminderMinutes: number;
  createdAt: Date;
  completedAt?: Date;
}

export type TaskCategory =
  | 'medication'
  | 'appointment'
  | 'exercise'
  | 'meal'
  | 'hygiene'
  | 'social'
  | 'therapy'
  | 'other';

export interface CognitiveExercise {
  id: string;
  title: string;
  description: string;
  type: ExerciseType;
  difficulty: 'easy' | 'medium' | 'hard';
  durationMinutes: number;
  points: number;
  icon: string;
}

export type ExerciseType =
  | 'memory'
  | 'attention'
  | 'language'
  | 'math'
  | 'pattern'
  | 'sequencing';

export interface ExerciseSession {
  id: string;
  exerciseId: string;
  startedAt: Date;
  completedAt?: Date;
  score: number;
  maxScore: number;
  accuracy: number;
  durationSeconds: number;
}

export interface MoodEntry {
  id: string;
  date: Date;
  mood: MoodLevel;
  energy: number; // 1-5
  notes?: string;
  factors?: string[];
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface ProgressStats {
  totalTasksToday: number;
  completedTasksToday: number;
  streakDays: number;
  weeklyAccuracy: number;
  totalExercisesCompleted: number;
  avgMoodWeek: number;
  cognitiveScore: number;
  lastUpdated: Date;
}

export interface AIInsight {
  id: string;
  type: 'reminder' | 'suggestion' | 'encouragement' | 'pattern' | 'alert';
  message: string;
  actionable?: string;
  generatedAt: Date;
  dismissed: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  age?: number;
  caregiverName?: string;
  caregiverContact?: string;
  diagnosisType?: string;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  preferredLanguage: string;
  dailyGoalTasks: number;
  dailyGoalExercises: number;
}

// ── Dyslexia Screening ───────────────────────────────────────────────────
// Added for the University Dyslexia Screening & Support System module.
// Mirrors the ERD: TEST_ITEM ──< ITEM_RESPONSE >── TEST_ATTEMPT ──< REMEDIAL_EXERCISE

export type DyslexiaTestType = 'reading' | 'grammar' | 'memory' | 'scenario' | 'maths';

/** The specific cognitive marker a test item targets (see Test Design & Justification slide). */
export type CognitiveMarker =
  | 'decoding_fluency'
  | 'phonological_mapping'
  | 'working_memory'
  | 'applied_comprehension'
  | 'numeracy_comorbidity';

export type RiskBand = 'low' | 'moderate' | 'high';

/** A single question in a test's item bank. Static content, seeded into SQLite on first run. */
export interface TestItem {
  id: string;
  testType: DyslexiaTestType;
  marker: CognitiveMarker;
  /** For memory-recall items: content shown briefly before the question, then hidden. */
  stimulus?: string;
  stimulusDisplayMs?: number;
  prompt: string;
  options: string[];
  correctAnswer: string;
  orderIndex: number;
}

/** One student's attempt at a full test (all items in one testType). */
export interface TestAttempt {
  id: string;
  testType: DyslexiaTestType;
  startedAt: Date;
  completedAt?: Date;
  rawScore: number;
  maxScore: number;
  accuracy: number; // 0-1
  riskBand?: RiskBand;
  durationSeconds: number;
  synced?: boolean;
}

/** One answered item within an attempt. */
export interface ItemResponse {
  id: string;
  attemptId: string;
  itemId: string;
  studentAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number;
}

/** An AI-generated (or fallback) practice exercise targeting a specific weak marker. */
export interface RemedialExercise {
  id: string;
  attemptId: string;
  marker: CognitiveMarker;
  content: string;
  generatedAt: Date;
  source: 'ai' | 'fallback';
}

/** Per-marker breakdown used on the Results screen and for remediation targeting. */
export interface MarkerBreakdown {
  marker: CognitiveMarker;
  correct: number;
  total: number;
}

// ── Auth / Admin ──────────────────────────────────────────────────────────

export type AppRole = 'student' | 'admin';

export interface AuthProfile {
  id: string; // matches Supabase auth.users.id
  name: string;
  role: AppRole;
}

/** One row in the admin dashboard's student list. */
export interface StudentSummary {
  studentId: string;
  name: string;
  attemptCount: number;
  lastRiskBand: RiskBand | null;
  lastTestType: DyslexiaTestType | null;
  lastAttemptAt: Date | null;
}
