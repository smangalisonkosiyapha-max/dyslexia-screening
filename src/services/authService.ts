// src/services/authService.ts
import * as Linking from 'expo-linking';
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

/**
 * Sends a password-reset email. The link in the email redirects back INTO
 * the app via a deep link (cognicare://reset-password in a built app, or an
 * exp:// URL in Expo Go), where App.tsx picks up the recovery tokens and
 * shows ResetPasswordScreen.
 *
 * The redirect URL must be allow-listed in Supabase: Authentication → URL
 * Configuration → Redirect URLs (add `cognicare://**` and `exp://**`).
 * Otherwise Supabase ignores it and falls back to the Site URL
 * (localhost:3000 by default), which is what causes "site can't be reached".
 */
export const resetPassword = async (email: string): Promise<void> => {
  const redirectTo = Linking.createURL('reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
};

/** Sets a new password for the currently signed-in (recovery) session. */
export const updatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
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
