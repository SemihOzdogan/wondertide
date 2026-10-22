import type { PlayerState } from '../../domain/game';
import { useGameStore } from '../../store/gameStore';
import { loadOrCreatePlayer, savePlayer } from './playerRepository';

function stateFromStore(state: PlayerState): PlayerState {
  return {
    energy: state.energy,
    maxEnergy: state.maxEnergy,
    lastEnergyRefreshAt: state.lastEnergyRefreshAt,
    coins: state.coins,
    gems: state.gems,
    dailyStreak: state.dailyStreak,
    lastDailyRewardAt: state.lastDailyRewardAt,
    inventory: state.inventory,
    board: state.board,
    storyProgress: state.storyProgress,
    mergeCount: state.mergeCount,
    generatedTileCount: state.generatedTileCount,
    hasSeenIntro: state.hasSeenIntro,
    lastSavedAt: state.lastSavedAt,
  };
}

export async function startCloudSync(accountId: string) {
  const localState = stateFromStore(useGameStore.getState());
  const remoteState = await loadOrCreatePlayer(accountId, localState);
  useGameStore.getState().hydrate(remoteState);

  let timer: ReturnType<typeof setTimeout> | undefined;
  return useGameStore.subscribe(nextState => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      savePlayer(accountId, stateFromStore(nextState)).catch(error =>
        console.warn('Bulut kaydı güncellenemedi:', error),
      );
    }, 700);
  });
}
