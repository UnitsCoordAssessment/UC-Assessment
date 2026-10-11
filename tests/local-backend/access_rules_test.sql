-- Checks the access rules in supabase/schema.sql against a local PostgreSQL.
-- Each block either must succeed or must fail with a specific error; any
-- surprise raises an exception and stops the script.
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect_error(sql text, expected_state text, label text)
returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL: % was allowed but should not be', label;
exception
  when others then
    if sqlstate = expected_state then
      raise notice 'ok   %  (blocked: %)', label, sqlerrm;
    elsif sqlerrm like 'FAIL:%' then
      raise;
    else
      raise exception 'FAIL: % failed with % (%), expected %', label, sqlstate, sqlerrm, expected_state;
    end if;
end $$;

grant execute on function pg_temp.expect_error(text, text, text) to anon, authenticated;

-- ---------------- As a student's browser (anon) ----------------
set role anon;

insert into public.sessions (id, site, course, instrument_version, started_at, consented_at,
                             age_range, academic_program, program_of_study)
values ('11111111-1111-4111-8111-111111111111', 'CSU', 'calc1', 'test', now(), now(),
        '18-22 years', 'Bachelor''s Degree', 'Mathematics');
\echo 'ok   anon can insert a session'

insert into public.sessions (id, site, course, instrument_version, started_at, consented_at)
values ('33333333-3333-4333-8333-333333333333', null, null, 'test', now(), now());
\echo 'ok   anon can insert a session without site or course (link without them)'

insert into public.participants (session_id, first_name, last_name, email)
values ('11111111-1111-4111-8111-111111111111', 'Ada', 'Lovelace', 'ada@school.edu');
\echo 'ok   anon can insert a participant (name and email)'

insert into public.trials (session_id, trial_index, kind, item_id, item_type, raw_answer, explanation, data)
values ('11111111-1111-4111-8111-111111111111', 3, 'problem', 'problem_01', 'typed', '12', 'because', '{"a":1}');
\echo 'ok   anon can insert a trial'

insert into public.completions (session_id, finished_at, n_trials)
values ('11111111-1111-4111-8111-111111111111', now(), 1);
\echo 'ok   anon can insert a completion'

select pg_temp.expect_error($q$select * from public.sessions$q$, '42501', 'anon reading sessions');
select pg_temp.expect_error($q$select * from public.participants$q$, '42501', 'anon reading names and emails');
select pg_temp.expect_error($q$select email from public.participants$q$, '42501', 'anon reading one column of participants');
select pg_temp.expect_error($q$select * from public.trials$q$, '42501', 'anon reading trials');
select pg_temp.expect_error($q$select * from public.completions$q$, '42501', 'anon reading completions');
select pg_temp.expect_error($q$select * from public.trials_deidentified$q$, '42501', 'anon reading the analysis view');
select pg_temp.expect_error($q$select last_value from public.trials_id_seq$q$, '42501', 'anon reading the row counter');
select pg_temp.expect_error($q$update public.participants set email = 'x@y.z'$q$, '42501', 'anon changing an email');
select pg_temp.expect_error($q$update public.trials set raw_answer = 'x'$q$, '42501', 'anon updating trials');
select pg_temp.expect_error($q$delete from public.sessions$q$, '42501', 'anon deleting sessions');
select pg_temp.expect_error($q$delete from public.participants$q$, '42501', 'anon deleting participants');
select pg_temp.expect_error(
  $q$insert into public.participants (session_id, first_name, last_name, email)
     values ('11111111-1111-4111-8111-111111111111', 'Second', 'Person', 'b@school.edu')$q$,
  '23505', 'anon adding a second participant to the same session');
select pg_temp.expect_error(
  $q$insert into public.participants (session_id, first_name, last_name, email)
     values ('33333333-3333-4333-8333-333333333333', 'Ada', 'Lovelace', 'not-an-email')$q$,
  '23514', 'anon saving an invalid email address');
select pg_temp.expect_error(
  $q$insert into public.participants (session_id, first_name, last_name, email)
     values ('33333333-3333-4333-8333-333333333333', '   ', 'Lovelace', 'a@b.edu')$q$,
  '23514', 'anon saving a blank first name');
select pg_temp.expect_error(
  $q$insert into public.trials (session_id, trial_index, kind, item_id, item_type, data)
     values ('22222222-2222-4222-8222-222222222222', 1, 'problem', 'x', 'typed', '{}')$q$,
  '23503', 'anon adding a trial to a session that does not exist');
select pg_temp.expect_error(
  $q$insert into public.trials (session_id, trial_index, kind, item_id, item_type, data)
     values ('11111111-1111-4111-8111-111111111111', 3, 'problem', 'problem_01', 'typed', '{}')$q$,
  '23505', 'anon saving the same page twice');
select pg_temp.expect_error(
  $q$insert into public.sessions (id, site, course, instrument_version, started_at, consented_at)
     values (gen_random_uuid(), 'csu; drop', 'calc1', 'test', now(), now())$q$,
  '23514', 'anon using a malformed site code');
select pg_temp.expect_error(
  $q$insert into public.trials (session_id, trial_index, kind, item_id, item_type, data)
     values ('11111111-1111-4111-8111-111111111111', 4, 'admin', 'x', 'typed', '{}')$q$,
  '23514', 'anon using an unknown page kind');

reset role;

-- ---------------- As a signed-in app user (authenticated) ----------------
set role authenticated;
select pg_temp.expect_error(
  $q$insert into public.sessions (id, instrument_version, started_at, consented_at)
     values (gen_random_uuid(), 'test', now(), now())$q$,
  '42501', 'authenticated inserting');
select pg_temp.expect_error($q$select * from public.participants$q$, '42501', 'authenticated reading names');
reset role;

-- ---------------- As the research team (service_role) ----------------
set role service_role;
do $$
declare n int; v int; p int;
begin
  select count(*) into n from public.trials;
  select count(*) into v from public.trials_deidentified;
  select count(*) into p from public.participants;
  if n <> 1 or v <> 1 or p <> 1 then
    raise exception 'FAIL: service_role saw % trials, % view rows, % participants', n, v, p;
  end if;
  raise notice 'ok   service_role can read everything (% trial, % view row, % participant)', n, v, p;
end $$;
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'trials_deidentified'
               and column_name in ('first_name', 'last_name', 'email')) then
    raise exception 'FAIL: the analysis view exposes names or email';
  end if;
  raise notice 'ok   the analysis view has no name or email columns';
end $$;
reset role;

-- Withdrawal by email: deleting the session removes everything linked to it.
delete from public.sessions where id in (
  select session_id from public.participants where lower(email) = lower('ADA@school.edu'));
do $$
begin
  if (select count(*) from public.trials) <> 0 or (select count(*) from public.completions) <> 0
     or (select count(*) from public.participants) <> 0 then
    raise exception 'FAIL: withdrawal left rows behind';
  end if;
  raise notice 'ok   withdrawal by email removes the participant, trials and completion';
end $$;

\echo 'ALL ACCESS-RULE CHECKS PASSED'
