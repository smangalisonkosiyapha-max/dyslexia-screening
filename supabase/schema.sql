-- ============================================================================
-- University Dyslexia Screening & Support System — Supabase schema
-- ============================================================================
-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor
-- > New query > paste this whole file > Run). Matches the ERD slide:
--   STUDENT (1)──<TEST_ATTEMPT>──(M) TEST_ITEM  via ITEM_RESPONSE
--   TEST_ATTEMPT (1)──<REMEDIAL_EXERCISE (M)
-- "STUDENT" here is Supabase's built-in auth.users, extended by `profiles`.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────
-- One row per auth user. role drives access: 'student' (default) or 'admin'.
-- Promote a user to admin manually — see README.md — there is no self-serve
-- admin signup, which is a deliberate access-control decision (NFR2/NFR6).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Student',
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Student'), 'student');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SECURITY DEFINER so RLS policies can check "is this caller an admin?"
-- without recursively re-checking RLS on profiles itself.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── test_items ──────────────────────────────────────────────────────────
-- Static item bank — same content as src/constants/dyslexiaTests.ts.
-- Kept in the backend too so the admin side can be fully self-contained
-- (e.g. joining a response back to the question it was answering).

create table if not exists public.test_items (
  id text primary key,
  test_type text not null,
  marker text not null,
  stimulus text,
  stimulus_display_ms integer,
  prompt text not null,
  options jsonb not null,
  correct_answer text not null,
  order_index integer not null
);

-- ── test_attempts ───────────────────────────────────────────────────────

create table if not exists public.test_attempts (
  id text primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  test_type text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  raw_score integer not null default 0,
  max_score integer not null default 0,
  accuracy numeric not null default 0,
  risk_band text check (risk_band in ('low', 'moderate', 'high')),
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists test_attempts_student_idx on public.test_attempts(student_id);
create index if not exists test_attempts_risk_band_idx on public.test_attempts(risk_band);

-- ── item_responses ──────────────────────────────────────────────────────

create table if not exists public.item_responses (
  id text primary key,
  attempt_id text not null references public.test_attempts(id) on delete cascade,
  item_id text not null references public.test_items(id),
  student_answer text not null,
  is_correct boolean not null,
  response_time_ms integer not null default 0
);

create index if not exists item_responses_attempt_idx on public.item_responses(attempt_id);

-- ── remedial_exercises ──────────────────────────────────────────────────

create table if not exists public.remedial_exercises (
  id text primary key,
  attempt_id text not null references public.test_attempts(id) on delete cascade,
  marker text not null,
  content text not null,
  generated_at timestamptz not null default now(),
  source text not null default 'ai' check (source in ('ai', 'fallback'))
);

create index if not exists remedial_exercises_attempt_idx on public.remedial_exercises(attempt_id);

-- ============================================================================
-- Row Level Security — NFR2/NFR6: a student only ever reads their own data;
-- only an authenticated admin can read across all students.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.test_items enable row level security;
alter table public.test_attempts enable row level security;
alter table public.item_responses enable row level security;
alter table public.remedial_exercises enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- test_items — reference data, readable by any signed-in user
drop policy if exists "test_items_select_authenticated" on public.test_items;
create policy "test_items_select_authenticated" on public.test_items
  for select using (auth.role() = 'authenticated');

-- test_attempts
drop policy if exists "attempts_select_own_or_admin" on public.test_attempts;
create policy "attempts_select_own_or_admin" on public.test_attempts
  for select using (student_id = auth.uid() or public.is_admin());

drop policy if exists "attempts_insert_own" on public.test_attempts;
create policy "attempts_insert_own" on public.test_attempts
  for insert with check (student_id = auth.uid());

-- item_responses (via parent attempt's ownership)
drop policy if exists "responses_select_own_or_admin" on public.item_responses;
create policy "responses_select_own_or_admin" on public.item_responses
  for select using (
    public.is_admin() or exists (
      select 1 from public.test_attempts a
      where a.id = item_responses.attempt_id and a.student_id = auth.uid()
    )
  );

drop policy if exists "responses_insert_own" on public.item_responses;
create policy "responses_insert_own" on public.item_responses
  for insert with check (
    exists (
      select 1 from public.test_attempts a
      where a.id = item_responses.attempt_id and a.student_id = auth.uid()
    )
  );

-- remedial_exercises (via parent attempt's ownership)
drop policy if exists "remedial_select_own_or_admin" on public.remedial_exercises;
create policy "remedial_select_own_or_admin" on public.remedial_exercises
  for select using (
    public.is_admin() or exists (
      select 1 from public.test_attempts a
      where a.id = remedial_exercises.attempt_id and a.student_id = auth.uid()
    )
  );

drop policy if exists "remedial_insert_own" on public.remedial_exercises;
create policy "remedial_insert_own" on public.remedial_exercises
  for insert with check (
    exists (
      select 1 from public.test_attempts a
      where a.id = remedial_exercises.attempt_id and a.student_id = auth.uid()
    )
  );

-- ============================================================================
-- Seed data — the 25-item test bank (5 items × 5 tests). Safe to re-run.
-- ============================================================================

insert into public.test_items
  (id, test_type, marker, stimulus, stimulus_display_ms, prompt, options, correct_answer, order_index)
values
  ('item_001', 'reading', 'decoding_fluency', NULL, NULL, 'Which word rhymes with "light"?', '["Late","Sight","Lit","Lot"]'::jsonb, 'Sight', 1),
  ('item_002', 'reading', 'decoding_fluency', NULL, NULL, 'Which word is spelled the way it sounds?', '["Knight","Cat","Though","Island"]'::jsonb, 'Cat', 2),
  ('item_003', 'reading', 'decoding_fluency', NULL, NULL, '"The quick brown fox jumps." What is the action word (verb) in this sentence?', '["Quick","Fox","Jumps","Brown"]'::jsonb, 'Jumps', 3),
  ('item_004', 'reading', 'decoding_fluency', NULL, NULL, 'Which word has the same beginning sound as "photo"?', '["Pot","Fish","Toy","Hot"]'::jsonb, 'Fish', 4),
  ('item_005', 'reading', 'decoding_fluency', NULL, NULL, 'Which of these is NOT a real word?', '["Brample","Bramble","Umbrella","Table"]'::jsonb, 'Brample', 5),
  ('item_006', 'grammar', 'phonological_mapping', NULL, NULL, 'Which spelling is correct?', '["Recieve","Receive","Receve","Receeve"]'::jsonb, 'Receive', 1),
  ('item_007', 'grammar', 'phonological_mapping', NULL, NULL, 'Choose the correct sentence.', '["She dont like tea.","She don’t likes tea.","She doesn’t like tea.","She doesn’t likes tea."]'::jsonb, 'She doesn’t like tea.', 2),
  ('item_008', 'grammar', 'phonological_mapping', NULL, NULL, 'Which spelling is correct?', '["Definately","Definitly","Definitely","Deffinitely"]'::jsonb, 'Definitely', 3),
  ('item_009', 'grammar', 'phonological_mapping', NULL, NULL, 'Which word correctly completes: "They ___ going to the shop."', '["is","are","be","was"]'::jsonb, 'are', 4),
  ('item_010', 'grammar', 'phonological_mapping', NULL, NULL, 'Which spelling is correct?', '["Neccessary","Necessary","Neccesary","Necesary"]'::jsonb, 'Necessary', 5),
  ('item_011', 'memory', 'working_memory', '7 - 2 - 9 - 4', 3500, 'What was the 2nd number in the sequence?', '["7","2","9","4"]'::jsonb, '2', 1),
  ('item_012', 'memory', 'working_memory', 'CAT - BOAT - LAMP', 3500, 'Which word came LAST?', '["CAT","BOAT","LAMP","None of these"]'::jsonb, 'LAMP', 2),
  ('item_013', 'memory', 'working_memory', '5 - 3 - 8 - 1 - 6', 4000, 'How many numbers were in the sequence?', '["3","4","5","6"]'::jsonb, '5', 3),
  ('item_014', 'memory', 'working_memory', 'RED - GREEN - BLUE', 3000, 'Which colour came FIRST?', '["RED","GREEN","BLUE","None of these"]'::jsonb, 'RED', 4),
  ('item_015', 'memory', 'working_memory', '9 - 4 - 2 - 7', 3500, 'What was the 3rd number in the sequence?', '["9","4","2","7"]'::jsonb, '2', 5),
  ('item_016', 'scenario', 'applied_comprehension', NULL, NULL, 'Sipho has 3 lectures today. He finishes the first at 10am and the second starts 30 minutes later. What time does the second lecture start?', '["10:00am","10:15am","10:30am","11:00am"]'::jsonb, '10:30am', 1),
  ('item_017', 'scenario', 'applied_comprehension', NULL, NULL, 'A notice says: "Submit assignments by Friday, 2 days before the module ends on Sunday." If the module ends on a Sunday, which day is the deadline?', '["Wednesday","Thursday","Friday","Saturday"]'::jsonb, 'Friday', 2),
  ('item_018', 'scenario', 'applied_comprehension', NULL, NULL, 'Thandi reads 4 pages every 10 minutes. At that pace, about how many pages will she read in 30 minutes?', '["8","10","12","16"]'::jsonb, '12', 3),
  ('item_019', 'scenario', 'applied_comprehension', NULL, NULL, 'A group project has 4 members and 8 tasks to split evenly. How many tasks does each member get?', '["1","2","4","8"]'::jsonb, '2', 4),
  ('item_020', 'scenario', 'applied_comprehension', NULL, NULL, 'The library closes at 8pm. It is currently 7:20pm. How many minutes are left until closing?', '["20","30","40","60"]'::jsonb, '40', 5),
  ('item_021', 'maths', 'numeracy_comorbidity', NULL, NULL, '12 × 6 = ?', '["71","72","73","74"]'::jsonb, '72', 1),
  ('item_022', 'maths', 'numeracy_comorbidity', NULL, NULL, '45 + 28 = ?', '["63","70","73","83"]'::jsonb, '73', 2),
  ('item_023', 'maths', 'numeracy_comorbidity', NULL, NULL, '90 ÷ 5 = ?', '["15","18","20","45"]'::jsonb, '18', 3),
  ('item_024', 'maths', 'numeracy_comorbidity', NULL, NULL, '100 − 37 = ?', '["63","67","73","77"]'::jsonb, '63', 4),
  ('item_025', 'maths', 'numeracy_comorbidity', NULL, NULL, '8 × 7 = ?', '["48","54","56","64"]'::jsonb, '56', 5)
on conflict (id) do update set
  test_type = excluded.test_type,
  marker = excluded.marker,
  stimulus = excluded.stimulus,
  stimulus_display_ms = excluded.stimulus_display_ms,
  prompt = excluded.prompt,
  options = excluded.options,
  correct_answer = excluded.correct_answer,
  order_index = excluded.order_index;
