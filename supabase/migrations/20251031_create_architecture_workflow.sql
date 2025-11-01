-- Architecture workflow tables + realtime-friendly
create table if not exists public.arch_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vision text not null,
  status text not null default 'running', -- queued|running|succeeded|failed
  model text,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.lane_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references public.arch_runs (id) on delete cascade,
  lane text not null check (lane in ('spec','sql','ui','test','cicd')),
  status text not null default 'queued', -- queued|running|succeeded|failed
  output jsonb,
  meta jsonb not null default '{}'::jsonb
);

alter table public.arch_runs enable row level security;
alter table public.lane_events enable row level security;

-- Demo policies; harden for prod
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='arch_runs' and policyname='arch_runs_read_all')
  then create policy arch_runs_read_all on public.arch_runs for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lane_events' and policyname='lane_events_read_all')
  then create policy lane_events_read_all on public.lane_events for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='arch_runs' and policyname='arch_runs_insert_all')
  then create policy arch_runs_insert_all on public.arch_runs for insert with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lane_events' and policyname='lane_events_insert_all')
  then create policy lane_events_insert_all on public.lane_events for insert with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='arch_runs' and policyname='arch_runs_update_all')
  then create policy arch_runs_update_all on public.arch_runs for update using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lane_events' and policyname='lane_events_update_all')
  then create policy lane_events_update_all on public.lane_events for update using (true) with check (true); end if;
end $$;
