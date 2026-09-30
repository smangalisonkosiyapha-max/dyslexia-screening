-- ============================================================================
-- Migration: remedial exercise program tracking + self-service account deletion
-- ============================================================================
-- Run this once in your Supabase project's SQL Editor, after
-- migration_contact_notes.sql. Adds:
--  (a) step_index/completed to remedial_exercises, so a single "practice
--      exercise" becomes a trackable 3-step program.
--  (b) a delete_own_account() function so a student can delete their own
--      account and all associated data (attempts, responses, exercises,
--      notes) in one action, from Profile.
-- ============================================================================

alter table public.remedial_exercises
  add column if not exists step_index integer not null default 0;
alter table public.remedial_exercises
  add column if not exists completed boolean not null default false;

-- SECURITY DEFINER is required because deleting from auth.users needs
-- elevated privilege a normal authenticated client doesn't have. Everything
-- else (profiles, test_attempts, item_responses, remedial_exercises,
-- student_notes) cascades automatically via the ON DELETE CASCADE
-- foreign keys already set up in schema.sql.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
