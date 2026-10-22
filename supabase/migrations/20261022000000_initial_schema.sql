-- Each player's mutable gameplay state is isolated in a single JSON document.
-- The document has a schema_version so future game updates can migrate it safely.
create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"schema_version": 1, "energy": 86, "coins": 0, "gems": 0, "inventory": {}, "story_progress": {}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Players can read only their own save"
  on public.players for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Players can create only their own save"
  on public.players for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Players can update only their own save"
  on public.players for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Players can delete only their own save"
  on public.players for delete
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger players_touch_updated_at
before update on public.players
for each row execute function public.touch_updated_at();
