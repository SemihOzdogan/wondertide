import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storyChapters } from '../content/stories';
import type { MergeTile, PlayerState, ResourceKind, StoryTask } from '../domain/game';

const initialBoard: Array<MergeTile | null> = Array.from({ length: 30 }, (_, index) => ({
  id: `start-${index}`,
  kind: (['driftwood', 'seaGlass', 'shell'] as ResourceKind[])[index % 3],
  level: 1,
}));

const initialPlayerState: PlayerState = {
  energy: 86, maxEnergy: 100, lastEnergyRefreshAt: new Date().toISOString(), coins: 1230, gems: 45, dailyStreak: 0, lastDailyRewardAt: null,
  inventory: { driftwood: 0, seaGlass: 0, shell: 0 },
  board: initialBoard,
  storyProgress: { chapterId: 'lighthouse-tales', unlockedChapterIds: ['lighthouse-tales'], completedTaskIds: [], restoredAreaIds: [] },
  mergeCount: 0, generatedTileCount: 0, generationQueue: ['driftwood', 'seaGlass', 'shell', 'driftwood', 'seaGlass', 'shell'], endlessProjectCount: 0, hasSeenIntro: false, lastSavedAt: new Date().toISOString(),
};

type GameStore = PlayerState & {
  generateTile: () => void;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
  buyEnergyWithCoins: () => boolean;
  buyEnergyWithGems: () => boolean;
  mergeTiles: (firstTileId: string, secondTileId: string) => boolean;
  deliverProjectTile: (tileId: string) => boolean;
  moveTile: (tileId: string, targetIndex: number) => boolean;
  refreshEnergy: () => void;
  canClaimDailyReward: () => boolean;
  claimDailyReward: () => { coins: number; gems: number; energy: number } | null;
  selectChapter: (chapterId: string) => void;
  unlockChapter: (chapterId: string) => void;
  canComplete: (task: StoryTask) => boolean;
  completeTask: (task: StoryTask) => boolean;
  completeEndlessProject: (task: StoryTask) => boolean;
  hydrate: (player: Partial<PlayerState>) => void;
  dismissIntro: () => void;
};

const resourceOrder: ResourceKind[] = ['driftwood', 'seaGlass', 'shell'];
const energyIntervalMs = 5 * 60 * 1000;
const boardCapacity = 30;
const maximumTileLevel = 3;

export function getEndlessProject(completedCount: number): StoryTask {
  const tier = Math.floor(completedCount / 3) + 1;
  const rotation = completedCount % resourceOrder.length;
  const primary = resourceOrder[rotation];
  const secondary = resourceOrder[(rotation + 1) % resourceOrder.length];
  const requirements: Partial<Record<ResourceKind, number>> = { [primary]: Math.min(4, tier + 1) };
  if (tier > 1) requirements[secondary] = Math.min(3, tier);
  return {
    id: `tide-contract-${completedCount}`,
    title: `Kıyı sözleşmesi ${completedCount + 1}`,
    description: tier === 1 ? 'Kıyının günlük onarımı için bir proje parçası hazırla.' : 'Değişen gelgit için kıyı savunmasını güçlendir.',
    requirements,
    reward: { coins: 180 + tier * 70, gems: completedCount > 0 && (completedCount + 1) % 5 === 0 ? 2 : 0 },
  };
}

function createGenerationBatch(seed: number): ResourceKind[] {
  const batch = [...resourceOrder, ...resourceOrder];
  let value = (seed + 1) * 48271;
  for (let index = batch.length - 1; index > 0; index -= 1) {
    value = (value * 16807) % 2147483647;
    const swapIndex = value % (index + 1);
    [batch[index], batch[swapIndex]] = [batch[swapIndex], batch[index]];
  }
  return batch;
}

function isSameLocalDay(first: string, second: string) {
  const a = new Date(first);
  const b = new Date(second);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(first: string, second: string) {
  const yesterday = new Date(second);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameLocalDay(first, yesterday.toISOString());
}

function normalizePlayer(player: Partial<PlayerState>): PlayerState {
  const merged = {
    ...initialPlayerState,
    ...player,
    inventory: { ...initialPlayerState.inventory, ...player.inventory },
    storyProgress: { ...initialPlayerState.storyProgress, ...player.storyProgress },
  };
  const elapsed = Date.now() - new Date(merged.lastEnergyRefreshAt).getTime();
  const recovered = Math.max(0, Math.floor(elapsed / energyIntervalMs));
  const energy = Math.min(merged.maxEnergy, merged.energy + recovered);
  const lastEnergyRefreshAt = recovered
    ? new Date(new Date(merged.lastEnergyRefreshAt).getTime() + recovered * energyIntervalMs).toISOString()
    : merged.lastEnergyRefreshAt;
  const savedBoard = Array.isArray(merged.board) ? merged.board : initialPlayerState.board;
  const isUnplayedLegacyBoard = merged.generatedTileCount === 0 && merged.mergeCount === 0 && savedBoard.filter(Boolean).length <= 6;
  const sourceBoard = isUnplayedLegacyBoard ? initialBoard : savedBoard;
  const board = [...sourceBoard.slice(0, boardCapacity), ...Array(Math.max(0, boardCapacity - sourceBoard.length)).fill(null)]
    .map(tile => tile ? {
      id: tile.id,
      kind: tile.kind,
      // Saved games created before levels existed are valid level-one tiles.
      level: tile.level === 2 || tile.level === 3 ? tile.level : 1,
    } : null);
  const generationQueue = Array.isArray(merged.generationQueue)
    ? merged.generationQueue.filter((kind): kind is ResourceKind => resourceOrder.includes(kind as ResourceKind))
    : initialPlayerState.generationQueue;
  const unlockedChapterIds = [...new Set(merged.storyProgress.unlockedChapterIds)];
  storyChapters.forEach((chapter, index) => {
    if (chapter.tasks.every(task => merged.storyProgress.completedTaskIds.includes(task.id))) {
      const nextChapter = storyChapters[index + 1];
      if (nextChapter && !unlockedChapterIds.includes(nextChapter.id)) unlockedChapterIds.push(nextChapter.id);
    }
  });
  const chapterId = unlockedChapterIds.includes(merged.storyProgress.chapterId)
    ? merged.storyProgress.chapterId
    : initialPlayerState.storyProgress.chapterId;
  return { ...merged, board, generationQueue: generationQueue.length ? generationQueue : createGenerationBatch(merged.generatedTileCount), energy, lastEnergyRefreshAt,
    storyProgress: { ...merged.storyProgress, chapterId, unlockedChapterIds } };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialPlayerState,
      generateTile: () => {
        const state = get();
        const currentBoard = [...state.board, ...Array(Math.max(0, boardCapacity - state.board.length)).fill(null)];
        const emptyIndex = currentBoard.findIndex(tile => tile === null);
        if (state.energy < 1 || emptyIndex === -1) return;
        const generationQueue = state.generationQueue.length
          ? [...state.generationQueue]
          : createGenerationBatch(state.generatedTileCount);
        const resource = generationQueue.shift()!;
        const tile: MergeTile = {
          id: `${Date.now()}-${state.generatedTileCount}`,
          kind: resource,
          level: 1,
        };
        const board = [...currentBoard];
        board[emptyIndex] = tile;
        const generatedTileCount = state.generatedTileCount + 1;
        const nextGenerationQueue = generationQueue.length ? generationQueue : createGenerationBatch(generatedTileCount);
        set({ energy: state.energy - 1, board, generatedTileCount, generationQueue: nextGenerationQueue,
          lastSavedAt: new Date().toISOString() });
      },
      spendCoins: amount => {
        if (!Number.isFinite(amount) || amount <= 0 || get().coins < amount) return false;
        set({ coins: get().coins - amount, lastSavedAt: new Date().toISOString() });
        return true;
      },
      spendGems: amount => {
        if (!Number.isFinite(amount) || amount <= 0 || get().gems < amount) return false;
        set({ gems: get().gems - amount, lastSavedAt: new Date().toISOString() });
        return true;
      },
      buyEnergyWithCoins: () => {
        const state = get();
        if (state.energy >= state.maxEnergy || state.coins < 100) return false;
        set({ coins: state.coins - 100, energy: Math.min(state.maxEnergy, state.energy + 5), lastSavedAt: new Date().toISOString() });
        return true;
      },
      buyEnergyWithGems: () => {
        const state = get();
        if (state.energy >= state.maxEnergy || state.gems < 1) return false;
        set({ gems: state.gems - 1, energy: Math.min(state.maxEnergy, state.energy + 10), lastSavedAt: new Date().toISOString() });
        return true;
      },
      refreshEnergy: () => {
        const state = get();
        const refreshed = normalizePlayer(state);
        if (refreshed.energy !== state.energy || refreshed.lastEnergyRefreshAt !== state.lastEnergyRefreshAt) {
          set({ energy: refreshed.energy, lastEnergyRefreshAt: refreshed.lastEnergyRefreshAt });
        }
      },
      mergeTiles: (firstTileId, secondTileId) => {
        const state = get();
        const firstIndex = state.board.findIndex(tile => tile?.id === firstTileId);
        const secondIndex = state.board.findIndex(tile => tile?.id === secondTileId);
        const first = state.board[firstIndex];
        const second = state.board[secondIndex];
        if (!first || !second || first.id === second.id || first.kind !== second.kind || first.level !== second.level) return false;

        if (first.level === maximumTileLevel) return false;
        const board = [...state.board];
        board[firstIndex] = null;
        board[secondIndex] = { ...second, level: (first.level + 1) as MergeTile['level'] };

        const mergeReward = first.level * 5;
        set({ board, coins: state.coins + mergeReward, mergeCount: state.mergeCount + 1,
          lastSavedAt: new Date().toISOString() });
        return true;
      },
      deliverProjectTile: tileId => {
        const state = get();
        const tileIndex = state.board.findIndex(tile => tile?.id === tileId);
        const tile = state.board[tileIndex];
        if (!tile || tile.level !== maximumTileLevel) return false;

        const board = [...state.board];
        const inventory = { ...state.inventory, [tile.kind]: state.inventory[tile.kind] + 1 };
        board[tileIndex] = null;
        set({ board, inventory, lastSavedAt: new Date().toISOString() });
        return true;
      },
      moveTile: (tileId, targetIndex) => {
        const state = get();
        const sourceIndex = state.board.findIndex(tile => tile?.id === tileId);
        if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= boardCapacity || state.board[targetIndex]) return false;
        const board = [...state.board];
        board[targetIndex] = board[sourceIndex];
        board[sourceIndex] = null;
        set({ board, lastSavedAt: new Date().toISOString() });
        return true;
      },
      canClaimDailyReward: () => {
        const lastClaim = get().lastDailyRewardAt;
        return !lastClaim || !isSameLocalDay(lastClaim, new Date().toISOString());
      },
      claimDailyReward: () => {
        const state = get();
        const now = new Date().toISOString();
        if (state.lastDailyRewardAt && isSameLocalDay(state.lastDailyRewardAt, now)) return null;
        const dailyStreak = state.lastDailyRewardAt && isYesterday(state.lastDailyRewardAt, now)
          ? Math.min(state.dailyStreak + 1, 7)
          : 1;
        const reward = { coins: 70 + dailyStreak * 15, gems: dailyStreak === 7 ? 3 : 0, energy: 8 };
        set({ dailyStreak, lastDailyRewardAt: now, coins: state.coins + reward.coins,
          gems: state.gems + reward.gems, energy: Math.min(state.energy + reward.energy, state.maxEnergy),
          lastSavedAt: now });
        return reward;
      },
      selectChapter: chapterId => {
        const state = get();
        if (!state.storyProgress.unlockedChapterIds.includes(chapterId)) return;
        set({ storyProgress: { ...state.storyProgress, chapterId }, lastSavedAt: new Date().toISOString() });
      },
      unlockChapter: chapterId => {
        const state = get();
        if (state.storyProgress.unlockedChapterIds.includes(chapterId)) return;
        set({ storyProgress: { ...state.storyProgress, unlockedChapterIds: [...state.storyProgress.unlockedChapterIds, chapterId] }, lastSavedAt: new Date().toISOString() });
      },
      canComplete: task => Object.entries(task.requirements).every(
        ([resource, required]) => get().inventory[resource as ResourceKind] >= (required ?? 0),
      ),
      completeTask: task => {
        const state = get();
        const chapterIndex = storyChapters.findIndex(chapter => chapter.id === state.storyProgress.chapterId);
        const chapter = storyChapters[chapterIndex];
        const expectedTask = chapter?.tasks.find(candidate => !state.storyProgress.completedTaskIds.includes(candidate.id));
        if (!chapter || expectedTask?.id !== task.id || state.storyProgress.completedTaskIds.includes(task.id) || !get().canComplete(task)) return false;
        const nextInventory = { ...state.inventory };
        Object.entries(task.requirements).forEach(([resource, required]) => {
          const key = resource as ResourceKind;
          nextInventory[key] -= required ?? 0;
        });
        const completedTaskIds = [...state.storyProgress.completedTaskIds, task.id];
        const nextChapter = storyChapters[chapterIndex + 1];
        const chapterFinished = chapter.tasks.every(candidate => completedTaskIds.includes(candidate.id));
        const unlockedChapterIds = chapterFinished && nextChapter && !state.storyProgress.unlockedChapterIds.includes(nextChapter.id)
          ? [...state.storyProgress.unlockedChapterIds, nextChapter.id]
          : state.storyProgress.unlockedChapterIds;
        set({ inventory: nextInventory, coins: state.coins + task.reward.coins,
          gems: state.gems + (task.reward.gems ?? 0),
          storyProgress: { ...state.storyProgress,
            completedTaskIds,
            unlockedChapterIds,
            restoredAreaIds: [...state.storyProgress.restoredAreaIds, task.id] },
          lastSavedAt: new Date().toISOString() });
        return true;
      },
      completeEndlessProject: task => {
        const state = get();
        const chapter = storyChapters.find(candidate => candidate.id === state.storyProgress.chapterId);
        const isStoryFinished = chapter?.id === storyChapters[storyChapters.length - 1]?.id
          && chapter.tasks.every(candidate => state.storyProgress.completedTaskIds.includes(candidate.id));
        const expectedTask = getEndlessProject(state.endlessProjectCount);
        if (!isStoryFinished || task.id !== expectedTask.id || !get().canComplete(task)) return false;
        const inventory = { ...state.inventory };
        Object.entries(task.requirements).forEach(([resource, required]) => {
          const key = resource as ResourceKind;
          inventory[key] -= required ?? 0;
        });
        set({ inventory, coins: state.coins + task.reward.coins,
          gems: state.gems + (task.reward.gems ?? 0),
          endlessProjectCount: state.endlessProjectCount + 1,
          lastSavedAt: new Date().toISOString() });
        return true;
      },
      hydrate: player => set(normalizePlayer(player)),
      dismissIntro: () => set({ hasSeenIntro: true, lastSavedAt: new Date().toISOString() }),
    }),
    { name: 'wondertide-player', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
