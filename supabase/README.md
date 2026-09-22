# Supabase setup — Disability Unit admin backend

This backs the real login + multi-student admin dashboard. Takes about 10 minutes.

## 1. Create a project

1. Go to https://supabase.com → sign up (free tier is enough for this) → **New project**.
2. Pick any name/region, set a database password (save it somewhere), wait ~2 minutes for it to provision.

## 2. Run the schema

1. In your project, open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` from this repo and click **Run**.
3. This creates all five tables, the auto-profile trigger, Row Level Security policies, and seeds the 25-question item bank.

## 3. Turn off email confirmation (for demo/dev speed)

By default Supabase requires clicking a confirmation email before login works.
For a class demo this just adds friction:

**Authentication → Providers → Email → toggle "Confirm email" OFF.**

(Turn it back on before anyone relies on this for real.)

## 4. Get your API keys

**Project Settings → API.** Copy:
- **Project URL**
- **anon / public** key (NOT the `service_role` key — never put that in the app)

## 5. Configure the app

Copy `.env.example` to `.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 6. Create your first admin account

Everyone who signs up through the app becomes a `student` by default (see the
`handle_new_user` trigger in `schema.sql`) — this is intentional, so no one
can self-promote to admin.

To make one account an admin for your demo:

1. Sign up normally through the app once (as if you were a student).
2. In Supabase, go to **Table Editor → profiles**, find that row, and change
   its `role` column from `student` to `admin`.
3. Log out and back in on the app — you'll land in the Admin dashboard instead
   of the student tabs.

## What's syncing, and what's still local

- **Attempts, responses, and remedial exercises** write to Supabase on submit
  (`src/services/syncService.ts`). If the device is offline, they're still
  saved locally and marked `synced = 0`; call `syncPendingAttempts()` (wired
  to run on app foreground) to push them once back online — this is the
  NFR5 offline-support behaviour.
- **Onboarding preferences** (name, caregiver contact, notification/location
  toggles) stay local-only for now — they were never part of the ERD's
  screening data and don't need to be admin-visible.
