-- A shared, one-day score board. Scores are written through the function below
-- so a player can only improve their own entry for the current day.
create table if not exists public.daily_challenge_scores (
  challenge_day date not null,
  player_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  score integer not null check (score >= 0 and score <= 10000),
  updated_at timestamptz not null default now(),
  primary key (challenge_day, player_id)
);

alter table public.daily_challenge_scores enable row level security;

create policy "Authenticated players can see daily rankings"
  on public.daily_challenge_scores for select to authenticated using (true);

create or replace function public.submit_daily_challenge_score(p_score integer)
returns public.daily_challenge_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_score public.daily_challenge_scores;
  friendly_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_score < 0 or p_score > 10000 then raise exception 'Invalid score'; end if;

  select coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), nullif(raw_user_meta_data ->> 'name', ''), 'Kaşif ' || left(auth.uid()::text, 4))
    into friendly_name
    from auth.users where id = auth.uid();

  insert into public.daily_challenge_scores (challenge_day, player_id, player_name, score)
  values (current_date, auth.uid(), friendly_name, p_score)
  on conflict (challenge_day, player_id) do update
    set score = greatest(daily_challenge_scores.score, excluded.score),
        player_name = excluded.player_name,
        updated_at = now()
  returning * into saved_score;
  return saved_score;
end;
$$;

grant execute on function public.submit_daily_challenge_score(integer) to authenticated;

-- Scales to a large player base without downloading every score to the phone.
-- It returns the podium plus the signed-in player's own position and total field.
create or replace function public.get_daily_challenge_leaderboard(p_podium_size integer default 3)
returns table (
  leaderboard_rank bigint,
  player_id uuid,
  player_name text,
  score integer,
  total_players bigint,
  is_current_player boolean
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (order by score desc, updated_at asc) as leaderboard_rank,
      player_id,
      player_name,
      score,
      count(*) over () as total_players
    from public.daily_challenge_scores
    where challenge_day = current_date
  )
  select leaderboard_rank, player_id, player_name, score, total_players, player_id = auth.uid()
  from ranked
  where leaderboard_rank <= greatest(1, least(p_podium_size, 10))
     or player_id = auth.uid()
  order by leaderboard_rank;
$$;

grant execute on function public.get_daily_challenge_leaderboard(integer) to authenticated;
