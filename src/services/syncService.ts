// src/services/syncService.ts
//
// Local SQLite stays the source of truth for the UI (instant, offline-safe —
// NFR5). This service pushes completed attempts to Supabase so the Disability
// Unit admin dashboard can see them. If the push fails (offline, etc.) the
// local row is simply left `synced = 0` and retried later — nothing in the
// student-facing flow depends on the push succeeding.

import { supabase, isSupabaseConfigured } from './supabase';
import {
  getUnsyncedAttempts, getResponsesForAttempt, getRemedialExercisesForAttempt, markAttemptSynced,
} from './database';
import { ItemResponse, RemedialExercise, TestAttempt } from '../constants/types';
import { getCurrentUserId } from './authService';

const attemptToRow = (a: TestAttempt, studentId: string) => ({
  id: a.id,
  student_id: studentId,
  test_type: a.testType,
  started_at: a.startedAt.toISOString(),
  completed_at: a.completedAt?.toISOString() ?? null,
  raw_score: a.rawScore,
  max_score: a.maxScore,
  accuracy: a.accuracy,
  risk_band: a.riskBand ?? null,
  duration_seconds: a.durationSeconds,
});

const responseToRow = (r: ItemResponse) => ({
  id: r.id,
  attempt_id: r.attemptId,
  item_id: r.itemId,
  student_answer: r.studentAnswer,
  is_correct: r.isCorrect,
  response_time_ms: r.responseTimeMs,
});

const remedialToRow = (r: RemedialExercise) => ({
  id: r.id,
  attempt_id: r.attemptId,
  marker: r.marker,
  content: r.content,
  generated_at: r.generatedAt.toISOString(),
  source: r.source,
});

/**
 * Pushes one freshly-completed attempt (+ its responses) to Supabase.
 * Call this right after the local insert in TestRunnerScreen. Never throws —
 * a failed push just leaves the attempt unsynced for the next retry.
 */
export const syncAttempt = async (attempt: TestAttempt, responses: ItemResponse[]): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  const studentId = await getCurrentUserId();
  if (!studentId) return false;

  try {
    const { error: attemptError } = await supabase.from('test_attempts').insert(attemptToRow(attempt, studentId));
    if (attemptError) throw attemptError;

    if (responses.length > 0) {
      const { error: responsesError } = await supabase.from('item_responses').insert(responses.map(responseToRow));
      if (responsesError) throw responsesError;
    }

    await markAttemptSynced(attempt.id);
    return true;
  } catch (e) {
    console.warn('syncAttempt failed, will retry later:', e);
    return false;
  }
};

/** Pushes a single remedial exercise once it's generated (student side). */
export const syncRemedialExercise = async (exercise: RemedialExercise): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('remedial_exercises').insert(remedialToRow(exercise));
  } catch (e) {
    console.warn('syncRemedialExercise failed (non-fatal):', e);
  }
};

/**
 * Retries every locally-unsynced attempt. Call on app foreground / when
 * connectivity is restored — this is the NFR5 offline-recovery path.
 */
export const syncPendingAttempts = async (): Promise<void> => {
  if (!isSupabaseConfigured) return;
  const pending = await getUnsyncedAttempts();
  for (const attempt of pending) {
    const responses = await getResponsesForAttempt(attempt.id);
    const ok = await syncAttempt(attempt, responses);
    if (ok) {
      const exercises = await getRemedialExercisesForAttempt(attempt.id);
      for (const ex of exercises) await syncRemedialExercise(ex);
    }
  }
};
