// src/services/supabase.ts
//
// Backend for the Disability Unit admin view: Postgres (via Supabase) so the
// schema mirrors the ERD slide exactly, with real auth and Row Level
// Security enforcing NFR2/NFR6 (a student only ever reads their own rows;
// only an authenticated admin can read across students).
//
// Setup (see supabase/README.md):
//   1. Create a free project at https://supabase.com
//   2. Run supabase/schema.sql in the project's SQL editor
//   3. Copy the Project URL and anon public key into .env (see .env.example)

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True once real credentials are configured — lets the app fail soft (local-only) otherwise. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase env vars are not set — the Screening sync and Admin dashboard will not work ' +
      'until EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env. ' +
      'See supabase/README.md.'
  );
}

// createClient() validates its URL immediately and throws if given an empty
// string — which would crash the whole app at import time before
// isSupabaseConfigured is ever checked. Falling back to a harmless
// placeholder here keeps the app running in local-only mode; every real
// call site already checks isSupabaseConfigured before using this client.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
