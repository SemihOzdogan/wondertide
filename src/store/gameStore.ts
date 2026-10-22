import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storyChapters } from '../content/stories';
import type { MergeTile, PlayerState, ResourceKind, StoryTask } from '../domain/game';

const initialPlayerState: PlayerState = {
  energy: 86, maxEnergy: 100, lastEnergyRefreshAt: new Date().toISOString(), coins: 1230, gems: 45, dailyStreak: 0, lastDailyRewardAt: null,
  inventory: { driftwood: 0, seaGlass: 0, shell: 0 },
  board: [
    { id: 'start-wood-a', kind: 'driftwood' },
    { id: 'start-wood-b', kind: 'driftwood' },
    { id: 'start-glass-a', kind: 'seaGlass' },
    { id: 'start-glass-b', kind: 'seaGlass' },
    { id: 'start-shell-a', kind: 'shell' },
    ...Array(25).fill(null),
  ],
  storyProgress: { chapterId: 'lighthouse-tales', unlockedChapterIds: ['lighthouse-tales'], completedTaskIds: [], restoredAreaIds: [] },
  mergeCount: 0, generatedTileCount: 0, hasSeenIntro: false, lastSavedAt: new Date().toISOString(),
};

type GameStore = PlayerState & {
  generateTile: () => void;
  mergeTiles: (firstTileId: string, secondTileId: string) => boolean;
  moveTile: (tileId: string, targetIndex: number) => boolean;
  refreshEnergy: () => void;
  canClaimDailyReward: () => boolean;
  claimDailyReward: () => { coins: number; gems: number; energy: number } | null;
  selectChapter: (chapterId: string) => void;
  unlockChapter: (chapterId: string) => void;
  canComplete: (task: StoryTask) => boolean;
  completeTask: (task: StoryTask) => boolean;
  hydrate: (player: Partial<PlayerState>) => void;
  dismissIntro: () => void;
};

const resourceOrder: ResourceKind[] = ['driftwood', 'seaGlass', 'shell'];
const energyIntervalMs = 5 * 60 * 1000;
const boardCapacity = 30;

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
  const sourceBoard = Array.isArray(merged.board) ? merged.board : initialPlayerState.board;
  const board = [...sourceBoard.slice(0, boardCapacity), ...Array(Math.max(0, boardCapacity - sourceBoard.length)).fill(null)]
    .map(tile => tile ? { id: tile.id, kind: tile.kind } : null);
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
  return { ...merged, board, energy, lastEnergyRefreshAt,
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
        const resource = resourceOrder[state.generatedTileCount % resourceOrder.length];
        const tile: MergeTile = {
          id: `${Date.now()}-${state.generatedTileCount}`,
          kind: resource,
        };
        const board = [...currentBoard];
        board[emptyIndex] = tile;
        set({ energy: state.energy - 1, board, generatedTileCount: state.generatedTileCount + 1,
          lastSavedAt: new Date().toISOString() });
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
        if (!first || !second || first.id === second.id || first.kind !== second.kind) return false;

        const board = [...state.board];
        board[firstIndex] = null;
        board[secondIndex] = null;
        const inventory = { ...state.inventory };
        inventory[first.kind] += 1;

        set({ board, inventory, mergeCount: state.mergeCount + 1,
          lastSavedAt: new Date().toISOString() });
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
      hydrate: player => set(normalizePlayer(player)),
      dismissIntro: () => set({ hasSeenIntro: true, lastSavedAt: new Date().toISOString() }),
    }),
    { name: 'wondertide-player', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
