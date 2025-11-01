/*
  # Model Constraints and Observability Enhancement

  1. Changes to arch_runs
    - Add `provider` column (text) - API provider used
    - Add `execution_ms` column (int) - Execution time for observability
    - Add CHECK constraint to enforce three-model contract

  2. Changes to mcp_jobs
    - Already has provider, model, execution_ms columns
    - Update CHECK constraint to match three-model contract

  3. Security
    - Constraints are defensive - prevent invalid data at DB level
    - Idempotent - safe to run multiple times
*/

-- Add columns to arch_runs if they don't exist
alter table if exists public.arch_runs
  add column if not exists provider text,
  add column if not exists execution_ms int;

-- Enforce 3-model contract on arch_runs
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='arch_runs' and column_name='model') then
    execute 'alter table public.arch_runs drop constraint if exists arch_runs_model_chk';
    execute $$alter table public.arch_runs
             add constraint arch_runs_model_chk
             check (model is null or model in ('GPT-5','Gemini-2.5-Pro','Claude-4.5-Sonnet'))$$;
  end if;
end $$;

-- mcp_jobs already has the columns, just update constraint if needed
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='mcp_jobs' and column_name='model') then
    execute 'alter table public.mcp_jobs drop constraint if exists mcp_jobs_model_chk';
    execute $$alter table public.mcp_jobs
             add constraint mcp_jobs_model_chk
             check (model is null or model in ('GPT-5','Gemini-2.5-Pro','Claude-4.5-Sonnet'))$$;
  end if;
end $$;

-- Add provider constraint to arch_runs if column exists
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='arch_runs' and column_name='provider') then
    execute 'alter table public.arch_runs drop constraint if exists arch_runs_provider_chk';
    execute $$alter table public.arch_runs
             add constraint arch_runs_provider_chk
             check (provider is null or provider in ('openai','google','anthropic'))$$;
  end if;
end $$;
