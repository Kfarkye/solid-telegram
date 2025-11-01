/*
  # MCP Jobs Queue System

  1. New Tables
    - `mcp_jobs`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, not null) - User who owns the job
      - `tool` (text, not null) - Tool to execute
      - `status` (text, not null) - Job status (queued, processing, completed, failed)
      - `priority` (int, not null, default 0) - Execution priority (-100 to 100)
      - `params` (jsonb, not null) - Tool parameters
      - `metadata` (jsonb, not null) - Additional metadata
      - `result` (jsonb) - Execution result
      - `error` (text) - Error message if failed
      - `attempts` (int, not null, default 0) - Retry attempts
      - `max_attempts` (int, not null, default 5) - Maximum retry attempts
      - `next_at` (timestamptz) - Next retry time
      - `execution_ms` (int) - Execution time in milliseconds
      - `provider` (text) - API provider (openai, google, anthropic)
      - `model` (text) - Model used (GPT-5, Gemini-2.5-Pro, Claude-4.5-Sonnet)
      - `created_at` (timestamptz, not null)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on `mcp_jobs` table
    - Add policies for authenticated users to manage their own jobs
    - Trigger to auto-set owner_id with SECURITY DEFINER

  3. Performance
    - Index on (owner_id, status, created_at) for dashboard queries
    - Index on (status, priority, created_at) for queue processing
    - Index on next_at for retry processing
    - Index on (status, started_at) for stuck job detection
*/

-- Create extension for UUID generation
create extension if not exists pgcrypto;

-- Create mcp_jobs table
create table if not exists public.mcp_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  tool text not null,
  status text not null default 'queued',
  priority int not null default 0,
  params jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_at timestamptz,
  execution_ms int,
  provider text,
  model text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,

  -- Database-level constraints for defense in depth
  constraint mcp_jobs_tool_chk
    check (tool in ('gemini-query', 'gpt-query', 'claude-query', 'multi-model-query')),
  constraint mcp_jobs_status_chk
    check (status in ('queued', 'processing', 'completed', 'failed')),
  constraint mcp_jobs_priority_chk
    check (priority between -100 and 100),
  constraint mcp_jobs_model_chk
    check (model is null or model in ('GPT-5', 'Gemini-2.5-Pro', 'Claude-4.5-Sonnet')),
  constraint mcp_jobs_provider_chk
    check (provider is null or provider in ('openai', 'google', 'anthropic'))
);

-- Performance indexes
create index if not exists mcp_jobs_owner_status_idx
  on public.mcp_jobs(owner_id, status, created_at desc);

create index if not exists mcp_jobs_priority_idx
  on public.mcp_jobs(status, priority desc, created_at);

create index if not exists mcp_jobs_created_idx
  on public.mcp_jobs(created_at desc);

create index if not exists mcp_jobs_next_at_idx
  on public.mcp_jobs(next_at nulls first)
  where status = 'queued';

create index if not exists mcp_jobs_stuck_idx
  on public.mcp_jobs(status, started_at)
  where status = 'processing';

create index if not exists mcp_jobs_queue_idx
  on public.mcp_jobs(priority desc, created_at asc)
  where status = 'queued' and (next_at is null or next_at <= now());

-- Enable RLS
alter table public.mcp_jobs enable row level security;

-- Auto-set owner_id trigger with pinned search path for security
create or replace function public.set_mcp_job_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mcp_jobs_owner on public.mcp_jobs;
create trigger trg_mcp_jobs_owner
  before insert on public.mcp_jobs
  for each row execute function public.set_mcp_job_owner();

-- RLS Policies - Owner-based access control
drop policy if exists "mcp_jobs_owner_select" on public.mcp_jobs;
create policy "mcp_jobs_owner_select" on public.mcp_jobs
  for select using (owner_id = auth.uid());

drop policy if exists "mcp_jobs_owner_insert" on public.mcp_jobs;
create policy "mcp_jobs_owner_insert" on public.mcp_jobs
  for insert with check (coalesce(owner_id, auth.uid()) = auth.uid());

drop policy if exists "mcp_jobs_owner_update" on public.mcp_jobs;
create policy "mcp_jobs_owner_update" on public.mcp_jobs
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "mcp_jobs_owner_delete" on public.mcp_jobs;
create policy "mcp_jobs_owner_delete" on public.mcp_jobs
  for delete using (owner_id = auth.uid());

-- Helper functions for queue management
create or replace function public.heal_stuck_jobs()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  healed_count int;
begin
  update public.mcp_jobs
  set
    status = 'queued',
    started_at = null,
    next_at = now() + interval '30 seconds',
    error = 'Job stuck in processing, auto-requeued'
  where
    status = 'processing'
    and started_at < now() - interval '5 minutes'
    and completed_at is null;

  get diagnostics healed_count = row_count;
  return healed_count;
end;
$$;

create or replace function public.get_next_mcp_job()
returns table(job_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select id as job_id
  from public.mcp_jobs
  where
    status = 'queued'
    and (next_at is null or next_at <= now())
  order by
    priority desc,
    created_at asc
  limit 1
  for update skip locked;
end;
$$;

-- Monitoring views
create or replace view public.mcp_queue_health as
select
  status,
  count(*) as job_count,
  avg(attempts) as avg_attempts,
  avg(execution_ms) as avg_execution_ms,
  percentile_cont(0.5) within group (order by execution_ms) as p50_ms,
  percentile_cont(0.95) within group (order by execution_ms) as p95_ms
from public.mcp_jobs
where created_at > now() - interval '24 hours'
group by status;

create or replace view public.mcp_user_activity as
select
  owner_id,
  count(*) as total_jobs,
  count(*) filter (where status = 'completed') as completed,
  count(*) filter (where status = 'failed') as failed,
  avg(execution_ms) as avg_execution_ms
from public.mcp_jobs
where created_at > now() - interval '7 days'
group by owner_id;

-- Grant permissions
grant select on public.mcp_queue_health to authenticated;
grant select on public.mcp_user_activity to authenticated;

-- Comments for documentation
comment on table public.mcp_jobs is 'Queue for MCP tool execution jobs with retry logic';
comment on column public.mcp_jobs.tool is 'Tool to execute (gemini-query, gpt-query, claude-query, multi-model-query)';
comment on column public.mcp_jobs.status is 'Job status (queued, processing, completed, failed)';
comment on column public.mcp_jobs.priority is 'Execution priority (-100 to 100, higher = sooner)';
comment on column public.mcp_jobs.model is 'Model used (GPT-5, Gemini-2.5-Pro, Claude-4.5-Sonnet)';
comment on column public.mcp_jobs.provider is 'API provider (openai, google, anthropic)';
comment on column public.mcp_jobs.execution_ms is 'Execution time in milliseconds for observability';
comment on function public.heal_stuck_jobs is 'Requeues jobs stuck in processing state over 5 minutes';
comment on function public.get_next_mcp_job is 'Gets next job to process with row-level locking';
