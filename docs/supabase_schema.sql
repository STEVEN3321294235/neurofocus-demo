-- NeuroFocus session history schema
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create table if not exists public.session_history (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    ts timestamptz not null default now(),
    test_mode text not null check (test_mode in ('training', 'challenge')),
    difficulty text,
    focused_ratio numeric,          -- % of session time above the stable threshold
    avg_recovery_ms numeric,        -- average time to climb back after a focus dip
    accuracy numeric,               -- challenge-mode answer accuracy %
    distance numeric,               -- boat distance (m)
    duration_ms numeric,            -- session length
    first_half_focus numeric,       -- avg focus, first half of the session
    second_half_focus numeric,      -- avg focus, second half of the session
    breathing_count integer,        -- box-breathing interventions triggered
    adaptive_threshold_used numeric -- per-session recovery threshold (Prompt H)
);

-- Row Level Security: each user can only touch their own rows.
alter table public.session_history enable row level security;

drop policy if exists "own rows select" on public.session_history;
create policy "own rows select" on public.session_history
    for select using (auth.uid() = user_id);

drop policy if exists "own rows insert" on public.session_history;
create policy "own rows insert" on public.session_history
    for insert with check (auth.uid() = user_id);

drop policy if exists "own rows delete" on public.session_history;
create policy "own rows delete" on public.session_history
    for delete using (auth.uid() = user_id);

create index if not exists session_history_user_ts
    on public.session_history (user_id, ts desc);
