// src/services/notesService.ts
//
// One-way follow-up notes from Disability Unit staff to a student.
// Deliberately not a full chat thread: staff-initiated only, auditable via
// Supabase RLS (see supabase/schema.sql), no open-ended student replies.

import { supabase, isSupabaseConfigured } from './supabase';
import { getCurrentUserId } from './authService';

export interface StudentNote {
  id: string;
  message: string;
  createdAt: Date;
  readAt: Date | null;
}

const rowToNote = (r: any): StudentNote => ({
  id: r.id,
  message: r.message,
  createdAt: new Date(r.created_at),
  readAt: r.read_at ? new Date(r.read_at) : null,
});

// ── Admin side ──────────────────────────────────────────────────────────

/** All notes left for one student, newest first. */
export const getNotesForStudent = async (studentId: string): Promise<StudentNote[]> => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('student_notes')
    .select('id, message, created_at, read_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) console.warn('getNotesForStudent failed:', error.message);
  if (error || !data) return [];
  return data.map(rowToNote);
};

/** Leaves a new follow-up note for a student, from the signed-in staff member. */
export const addNoteForStudent = async (studentId: string, message: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !message.trim()) return false;
  const staffId = await getCurrentUserId();
  if (!staffId) return false;

  const { error } = await supabase.from('student_notes').insert({
    student_id: studentId,
    staff_id: staffId,
    message: message.trim(),
  });
  if (error) {
    console.warn('addNoteForStudent failed:', error.message);
    return false;
  }
  return true;
};

// ── Student side ────────────────────────────────────────────────────────

/** The signed-in student's own notes, newest first. */
export const getMyNotes = async (): Promise<StudentNote[]> => {
  if (!isSupabaseConfigured) return [];
  const studentId = await getCurrentUserId();
  if (!studentId) return [];

  const { data, error } = await supabase
    .from('student_notes')
    .select('id, message, created_at, read_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(rowToNote);
};

/** Marks a note as read — call when the student views it. */
export const markNoteRead = async (noteId: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('student_notes').update({ read_at: new Date().toISOString() }).eq('id', noteId);
  } catch (e) {
    console.warn('markNoteRead failed (non-fatal):', e);
  }
};
