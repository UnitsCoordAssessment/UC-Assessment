-- =============================================================================
-- schema.sql — database tables and access rules for the assessment.
--
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Nothing here deletes data, and it is safe to run again.
--
-- If you ran an EARLIER version of this file (the one with study IDs), its
-- tables have different columns. If they hold no real data, remove them first
-- by running these three lines, then run this whole file:
--   drop view  if exists public.trials_deidentified;
--   drop table if exists public.completions, public.trials, public.participants, public.sessions;
--
-- Tables
--   sessions      one row per student sitting: site, course, demographics
--   participants  name and email, kept apart from everything else so that
--                 analysis files never need to include them
--   trials        one row per problem page (answer, explanation, timing,
--                 cursor data)
--   completions   one row per sitting that reached the last page
--
-- Who can do what
--   Students' browsers (the public key, role "anon"): INSERT only. They cannot
--     read, change or delete anything, including their own rows.
--   Signed-in app users ("authenticated"): nothing.
--   Research team: reads data with the secret key from a private computer
--     (scripts/export_data.py) or in the Supabase dashboard. The secret key
--     bypasses these rules, so it must never go in the website.
--
-- Defence in depth: table privileges are revoked AND row-level security is on,
-- so a mistake in one layer is still caught by the other.
-- =============================================================================

create table if not exists public.sessions (
  id                  uuid primary key,
  site                text check (site ~ '^[A-Z]{2,10}$'),
  course              text check (course ~ '^[a-z0-9_]{1,40}$'),
  instrument_version  text not null check (char_length(instrument_version) <= 40),
  started_at          timestamptz not null,   -- page opened
  consented_at        timestamptz not null,   -- student chose Yes on the consent page
  age_range           text check (char_length(age_range) <= 100),
  academic_program    text check (char_length(academic_program) <= 200),
  program_of_study    text check (char_length(program_of_study) <= 400),
  client              jsonb check (client is null or pg_column_size(client) < 8000),
  received_at         timestamptz not null default now()
);

create table if not exists public.participants (
  session_id          uuid primary key references public.sessions (id) on delete cascade,
  first_name          text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name           text not null check (char_length(btrim(last_name)) between 1 and 100),
  email               text not null check (char_length(email) <= 254
                                           and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  received_at         timestamptz not null default now()
);

create index if not exists participants_email_idx on public.participants (lower(email));

create table if not exists public.trials (
  id                  bigint generated always as identity primary key,
  session_id          uuid not null references public.sessions (id) on delete cascade,
  trial_index         integer not null check (trial_index between 0 and 10000),
  kind                text not null check (kind in ('practice', 'problem')),
  item_id             text not null check (char_length(item_id) <= 100),
  item_type           text not null check (item_type in ('typed', 'choice', 'yesno')),
  instrument_version  text check (char_length(instrument_version) <= 40),
  raw_answer          text check (char_length(raw_answer) <= 2000),
  explanation         text check (char_length(explanation) <= 20000),
  is_correct          boolean,
  rt_ms               integer check (rt_ms >= 0),
  time_elapsed_ms     bigint check (time_elapsed_ms >= 0),
  left_page_count     integer check (left_page_count >= 0),
  left_page_ms        integer check (left_page_ms >= 0),
  data                jsonb not null check (pg_column_size(data) < 2000000),
  received_at         timestamptz not null default now(),
  -- Retried saves of the same page are rejected as duplicates instead of stored twice.
  unique (session_id, trial_index)
);

create index if not exists trials_session_idx on public.trials (session_id);
create index if not exists trials_item_idx on public.trials (item_id);

create table if not exists public.completions (
  session_id          uuid primary key references public.sessions (id) on delete cascade,
  finished_at         timestamptz not null,
  n_trials            integer check (n_trials >= 0),
  summary             jsonb check (summary is null or pg_column_size(summary) < 8000),
  received_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------

-- Layer 1: table privileges. Supabase grants new tables to anon and
-- authenticated by default; take that back, then give anon INSERT only.
revoke all on public.sessions, public.participants, public.trials, public.completions
  from anon, authenticated;
revoke all on sequence public.trials_id_seq from anon, authenticated; -- would reveal row counts
grant insert on public.sessions, public.participants, public.trials, public.completions to anon;

-- Layer 2: row-level security. With RLS on, only what a policy allows is allowed.
alter table public.sessions     enable row level security;
alter table public.participants enable row level security;
alter table public.trials       enable row level security;
alter table public.completions  enable row level security;

drop policy if exists "browsers can add sessions" on public.sessions;
create policy "browsers can add sessions" on public.sessions
  for insert to anon with check (true);

drop policy if exists "browsers can add participants" on public.participants;
create policy "browsers can add participants" on public.participants
  for insert to anon with check (true);

drop policy if exists "browsers can add trials" on public.trials;
create policy "browsers can add trials" on public.trials
  for insert to anon with check (true);

drop policy if exists "browsers can add completions" on public.completions;
create policy "browsers can add completions" on public.completions
  for insert to anon with check (true);

-- No SELECT, UPDATE or DELETE policies exist, so none of those are possible
-- through the public key.

-- ---------------------------------------------------------------------------
-- Analysis view: one row per problem page with site, course and demographics,
-- and WITHOUT names or email. security_invoker makes the view obey the access
-- rules above instead of bypassing them.
-- ---------------------------------------------------------------------------
create or replace view public.trials_deidentified
with (security_invoker = true) as
select
  t.id            as trial_row_id,
  s.id            as session_id,
  s.site,
  s.course,
  s.age_range,
  s.academic_program,
  s.program_of_study,
  t.instrument_version,
  t.trial_index,
  t.kind,
  t.item_id,
  t.item_type,
  t.raw_answer,
  t.explanation,
  t.is_correct,
  t.rt_ms,
  t.left_page_count,
  t.left_page_ms,
  t.data -> 'parsed' ->> 'normalized'          as parsed_normalized,
  t.data -> 'parsed' -> 'structure' ->> 'kind' as parsed_structure,
  (c.session_id is not null)                   as session_completed
from public.trials t
join public.sessions s on s.id = t.session_id
left join public.completions c on c.session_id = s.id;

revoke all on public.trials_deidentified from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Useful queries (run in the SQL Editor; they are commented out on purpose)
-- ---------------------------------------------------------------------------
-- Sittings per site and course, and how many finished:
--   select s.site, s.course, count(*) as started, count(c.session_id) as finished
--   from public.sessions s left join public.completions c on c.session_id = s.id
--   group by 1, 2 order by 1, 2;
--
-- A participant withdraws: delete everything for their email address
-- (cascades to participants, trials and completions). Check first, then delete.
--   select s.id, s.started_at from public.sessions s
--   join public.participants p on p.session_id = s.id
--   where lower(p.email) = lower('student@example.edu');
--
--   delete from public.sessions where id in (
--     select session_id from public.participants
--     where lower(email) = lower('student@example.edu'));
