// src/services/authService.ts
import { supabase } from './supabase';
import { AppRole, AuthProfile } from '../constants/types';

export const signUp = async (name: string, email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }, // read by the handle_new_user() trigger
  });
  if (error) throw error;
};

export const signIn = async (email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
};

/** Fetches the caller's own profile (id, name, role) — role decides student vs admin routing. */
export const getMyProfile = async (): Promise<AuthProfile | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return { id: data.id, name: data.name, role: data.role as AppRole };
};

export const onAuthStateChange = (callback: (userId: string | null) => void) => {
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user.id ?? null);
  });
  return () => sub.subscription.unsubscribe();
};
