// src/services/adminService.ts
// Read-only queries for the Disability Unit admin dashboard. All of these
// rely entirely on Supabase RLS (public.is_admin()) to enforce access —
// if the signed-in user isn't an admin, these simply return nothing rather
// than erroring, since RLS filters rows rather than rejecting the query.

import { supabase } from './supabase';
import { RiskBand, StudentSummary, DyslexiaTestType } from '../constants/types';

/**
 * Counts ONE band per student: their most recent test result. Derived from the
 * same StudentSummary rows the dashboard list uses, so the top cards and the
 * list/filter chips can never disagree. Students who haven't tested yet are
 * not counted in any band (they appear under "Not started").
 */
export const countLatestRiskBands = (students: StudentSummary[]): Record<RiskBand, number> => {
  const counts: Record<RiskBand, number> = { low: 0, moderate: 0, high: 0 };
  for (const s of students) {
    if (s.lastRiskBand && s.lastRiskBand in counts) counts[s.lastRiskBand] += 1;
  }
  return counts;
};

/**
 * One row per REGISTERED student, with their most recent result if they have
 * one. Starting from profiles (not test_attempts) means students who have
 * signed up but not tested yet still show up, so staff can see their contact
 * details and reach out to them.
 */
export const getStudentSummaries = async (): Promise<StudentSummary[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, created_at, test_attempts(test_type, risk_band, started_at)')
    .eq('role', 'student');

  if (error) console.warn('getStudentSummaries failed:', error.message);
  if (error || !data) return [];

  const summaries: StudentSummary[] = (data as any[]).map(p => {
    const attempts = ((p.test_attempts ?? []) as any[])
      .slice()
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    const latest = attempts[0];
    return {
      studentId: p.id,
      name: p.name ?? 'Unknown student',
      attemptCount: attempts.length,
      lastRiskBand: (latest?.risk_band as RiskBand | null) ?? null,
      lastTestType: (latest?.test_type as DyslexiaTestType | undefined) ?? null,
      lastAttemptAt: latest ? new Date(latest.started_at) : null,
      registeredAt: p.created_at ? new Date(p.created_at) : null,
      email: p.email ?? null,
    };
  });

  // Students with results first (most recent activity on top), then students
  // who haven't tested yet, newest sign-up first.
  return summaries.sort((a, b) => {
    if (a.lastAttemptAt && b.lastAttemptAt)
      return b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime();
    if (a.lastAttemptAt) return -1;
    if (b.lastAttemptAt) return 1;
    return (b.registeredAt?.getTime() ?? 0) - (a.registeredAt?.getTime() ?? 0);
  });
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

export interface StudentContact {
  id: string;
  name: string;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

/** A student's contact info, for the "reach the student" section of Student Detail. */
export const getStudentContact = async (studentId: string): Promise<StudentContact | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, emergency_contact_name, emergency_contact_phone')
    .eq('id', studentId)
    .single();

  if (error) console.warn('getStudentContact failed:', error.message);
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    emergencyContactName: data.emergency_contact_name,
    emergencyContactPhone: data.emergency_contact_phone,
  };
};
