-- JSONB metanotes
create extension if not exists pgcrypto;

create table if not exists public.metanotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id text not null,
  model text not null,
  provider text not null,
  input_sha256 text not null,
  prompt_preview text,
  notes jsonb not null
);

alter table public.metanotes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='metanotes' and policyname='metanotes_read_all')
  then create policy metanotes_read_all on public.metanotes for select using (true); end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='metanotes' and policyname='metanotes_insert_all')
  then create policy metanotes_insert_all on public.metanotes for insert with check (true); end if;
end $$;
