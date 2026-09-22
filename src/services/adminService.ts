// src/services/adminService.ts
// Read-only queries for the Disability Unit admin dashboard. All of these
// rely entirely on Supabase RLS (public.is_admin()) to enforce access —
// if the signed-in user isn't an admin, these simply return nothing rather
// than erroring, since RLS filters rows rather than rejecting the query.

import { supabase } from './supabase';
import { RiskBand, StudentSummary, DyslexiaTestType } from '../constants/types';

export const getAdminRiskBandCounts = async (): Promise<Record<RiskBand, number>> => {
  const { data, error } = await supabase.from('test_attempts').select('risk_band');
  const counts: Record<RiskBand, number> = { low: 0, moderate: 0, high: 0 };
  if (error || !data) return counts;
  for (const row of data) {
    const band = row.risk_band as RiskBand | null;
    if (band && band in counts) counts[band] += 1;
  }
  return counts;
};

/** One row per student who has at least one attempt, with their most recent result. */
export const getStudentSummaries = async (): Promise<StudentSummary[]> => {
  const { data, error } = await supabase
    .from('test_attempts')
    .select('student_id, test_type, risk_band, started_at, profiles!inner(name)')
    .order('started_at', { ascending: false });

  if (error || !data) return [];

  const byStudent = new Map<string, StudentSummary>();
  for (const row of data as any[]) {
    const existing = byStudent.get(row.student_id);
    if (existing) {
      existing.attemptCount += 1;
    } else {
      byStudent.set(row.student_id, {
        studentId: row.student_id,
        name: row.profiles?.name ?? 'Unknown student',
        attemptCount: 1,
        lastRiskBand: row.risk_band as RiskBand | null,
        lastTestType: row.test_type as DyslexiaTestType,
        lastAttemptAt: new Date(row.started_at),
      });
    }
  }
  return Array.from(byStudent.values()).sort(
    (a, b) => (b.lastAttemptAt?.getTime() ?? 0) - (a.lastAttemptAt?.getTime() ?? 0)
  );
};

export interface AdminAttemptRow {
  id: string;
  testType: DyslexiaTestType;
  startedAt: Date;
  accuracy: number;
  riskBand: RiskBand | null;
}

export const getAttemptsForStudent = async (studentId: string): Promise<AdminAttemptRow[]> => {
  const { data, error } = await supabase
    .from('test_attempts')
    .select('id, test_type, started_at, accuracy, risk_band')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    testType: r.test_type,
    startedAt: new Date(r.started_at),
    accuracy: r.accuracy,
    riskBand: r.risk_band,
  }));
};
