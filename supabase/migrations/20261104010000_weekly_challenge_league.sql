-- Weekly league: each player contributes their best score from every daily
-- challenge completed between Monday and Sunday.  The phone receives only the
-- podium plus its own row, so the query remains compact as the player base grows.
create or replace function public.get_weekly_challenge_leaderboard(p_podium_size integer default 3)
returns table (
  leaderboard_rank bigint,
  player_id uuid,
  player_name text,
  score bigint,
  total_players bigint,
  is_current_player boolean
)
language sql
security definer
set search_path = public
as $$
  with weekly_totals as (
    select
      player_id,
      max(player_name) as player_name,
      sum(score)::bigint as score
    from public.daily_challenge_scores
    where challenge_day >= date_trunc('week', current_date)::date
      and challenge_day < (date_trunc('week', current_date)::date + 7)
    group by player_id
  ), ranked as (
    select
      row_number() over (order by score desc, player_id) as leaderboard_rank,
      player_id,
      player_name,
      score,
      count(*) over () as total_players
    from weekly_totals
  )
  select leaderboard_rank, player_id, player_name, score, total_players, player_id = auth.uid()
  from ranked
  where leaderboard_rank <= greatest(1, least(p_podium_size, 10))
     or player_id = auth.uid()
  order by leaderboard_rank;
$$;

grant execute on function public.get_weekly_challenge_leaderboard(integer) to authenticated;
