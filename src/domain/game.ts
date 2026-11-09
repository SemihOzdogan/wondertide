export type ResourceKind = 'driftwood' | 'seaGlass' | 'shell';
export type WeatherType = 'sunny' | 'rainy' | 'windy' | 'foggy';

export type IslandDecoration = {
  id: string;
  title: string;
  icon: string;
  cost: number;
};

export const islandDecorationCatalog: IslandDecoration[] = [
  { id: 'palm-tree', title: 'Palmiye ağacı', icon: '🌴', cost: 80 },
  { id: 'lighthouse', title: 'Mini fener', icon: '🗼', cost: 120 },
  { id: 'beach-umbrella', title: 'Plaj şemsiyesi', icon: '⛱️', cost: 100 },
  { id: 'sailboat', title: 'Yelkenli', icon: '⛵', cost: 150 },
  { id: 'treasure-chest', title: 'Sandık', icon: '🪙', cost: 180 },
];

export type MergeTile = {
  id: string;
  kind: ResourceKind;
  /** A tile must be merged with another tile at the same level. */
  level: 1 | 2 | 3;
};

export type StoryProgress = {
  chapterId: string;
  unlockedChapterIds: string[];
  completedTaskIds: string[];
  restoredAreaIds: string[];
};

export type PlayerState = {
  energy: number;
  maxEnergy: number;
  lastEnergyRefreshAt: string;
  coins: number;
  gems: number;
  dailyStreak: number;
  lastDailyRewardAt: string | null;
  inventory: Record<ResourceKind, number>;
  board: Array<MergeTile | null>;
  storyProgress: StoryProgress;
  mergeCount: number;
  generatedTileCount: number;
  generationQueue: ResourceKind[];
  /** Cells covered in seaweed can only be cleared by merging onto their tile. */
  mossyCellIndices: number[];
  rewardedEnergyAdWatchCount: number;
  lastRewardedEnergyAdAt: string | null;
  rewardedGemAdWatchCount: number;
  lastRewardedGemAdAt: string | null;
  endlessProjectCount: number;
  /** Best score achieved in the shared daily 20-move challenge. */
  dailyChallengeBestScore: number;
  lastDailyChallengeAt: string | null;
  hasSeenIntro: boolean;
  tutorialPhase: 'welcome' | 'board' | 'complete';
  tutorialVersion: number;
  lastSavedAt: string;
  weather: WeatherType;
  weatherUpdatedAt: string;
  companionBond: number;
  companionLastPlayedAt: string | null;
  treasureMapPieces: number;
  treasureMapClaimedChapterIds: string[];
  islandDecorations: string[];
  musicEnabled: boolean;
  effectsEnabled: boolean;
};

export type StoryTask = {
  id: string;
  title: string;
  description: string;
  requirements: Partial<Record<ResourceKind, number>>;
  reward: { coins: number; gems?: number };
};

export type StoryChapter = {
  id: string;
  title: string;
  location: string;
  theme: string;
  introduction: string;
  mapIcon: string;
  tasks: StoryTask[];
};
