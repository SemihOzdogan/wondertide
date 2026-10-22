import type { PlayerState } from '../../domain/game';
import { supabase } from './supabase';

type PlayerRow = { id: string; state: PlayerState };

export async function loadOrCreatePlayer(
  accountId: string,
  fallback: PlayerState,
): Promise<PlayerState> {
  const { data, error } = await supabase
    .from('players')
    .select('id, state')
    .eq('id', accountId)
    .maybeSingle<PlayerRow>();

  if (error) throw error;
  if (data?.state) return data.state;

  await savePlayer(accountId, fallback);
  return fallback;
}

export async function savePlayer(accountId: string, state: PlayerState) {
  const { error } = await supabase
    .from('players')
    .upsert({ id: accountId, state }, { onConflict: 'id' });

  if (error) throw error;
}
