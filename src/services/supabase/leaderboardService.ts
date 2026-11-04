import { supabase } from './supabase';

export type DailyLeaderboardEntry = {
  leaderboard_rank: number;
  player_id: string;
  player_name: string;
  score: number;
  total_players: number;
  is_current_player: boolean;
};

export type DailyLeaderboard = {
  entries: DailyLeaderboardEntry[];
  totalPlayers: number;
  period: 'weekly' | 'daily';
};

export async function submitDailyChallengeScore(score: number) {
  const { error } = await supabase.rpc('submit_daily_challenge_score', {
    p_score: score,
  });
  if (error) throw error;
}

export async function loadDailyLeaderboard(): Promise<DailyLeaderboard> {
  const { data, error } = await supabase.rpc(
    'get_daily_challenge_leaderboard',
    { p_podium_size: 3 },
  );
  if (error?.code === 'PGRST202') return loadLegacyDailyLeaderboard();
  if (error) throw error;
  const entries = (data ?? []) as DailyLeaderboardEntry[];
  return {
    entries,
    totalPlayers: entries[0]?.total_players ?? 0,
    period: 'daily',
  };
}

/** Weekly league ranks the sum of each player's best daily scores this week. */
export async function loadWeeklyLeaderboard(): Promise<DailyLeaderboard> {
  const { data, error } = await supabase.rpc(
    'get_weekly_challenge_leaderboard',
    { p_podium_size: 3 },
  );
  if (error?.code === 'PGRST202') {
    const dailyLeaderboard = await loadDailyLeaderboard();
    return { ...dailyLeaderboard, period: 'daily' };
  }
  if (error) throw error;
  const entries = (data ?? []) as DailyLeaderboardEntry[];
  return {
    entries,
    totalPlayers: entries[0]?.total_players ?? 0,
    period: 'weekly',
  };
}

/** Supports projects that created the score table before the scalable RPC existed. */
async function loadLegacyDailyLeaderboard(): Promise<DailyLeaderboard> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error, count } = await supabase
    .from('daily_challenge_scores')
    .select('player_id, player_name, score', { count: 'exact' })
    .eq('challenge_day', today)
    .order('score', { ascending: false })
    .limit(3);
  if (error) throw error;
  return {
    entries: (data ?? []).map((entry, index) => ({
      ...entry,
      leaderboard_rank: index + 1,
      total_players: count ?? 0,
      is_current_player: false,
    })),
    totalPlayers: count ?? 0,
    period: 'daily',
  };
}
