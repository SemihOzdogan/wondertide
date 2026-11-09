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
    generationQueue: state.generationQueue,
    mossyCellIndices: state.mossyCellIndices,
    rewardedEnergyAdWatchCount: state.rewardedEnergyAdWatchCount,
    lastRewardedEnergyAdAt: state.lastRewardedEnergyAdAt,
    rewardedGemAdWatchCount: state.rewardedGemAdWatchCount,
    lastRewardedGemAdAt: state.lastRewardedGemAdAt,
    endlessProjectCount: state.endlessProjectCount,
    dailyChallengeBestScore: state.dailyChallengeBestScore,
    lastDailyChallengeAt: state.lastDailyChallengeAt,
    hasSeenIntro: state.hasSeenIntro,
    tutorialPhase: state.tutorialPhase,
    tutorialVersion: state.tutorialVersion,
    lastSavedAt: state.lastSavedAt,
    weather: state.weather,
    weatherUpdatedAt: state.weatherUpdatedAt,
    companionBond: state.companionBond,
    companionLastPlayedAt: state.companionLastPlayedAt,
    treasureMapPieces: state.treasureMapPieces,
    treasureMapClaimedChapterIds: state.treasureMapClaimedChapterIds,
    islandDecorations: state.islandDecorations,
    musicEnabled: state.musicEnabled,
    effectsEnabled: state.effectsEnabled,
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
