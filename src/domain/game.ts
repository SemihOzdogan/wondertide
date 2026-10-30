export type ResourceKind = 'driftwood' | 'seaGlass' | 'shell';

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
  rewardedAdWatchCount: number;
  lastRewardedAdAt: string | null;
  endlessProjectCount: number;
  hasSeenIntro: boolean;
  tutorialPhase: 'welcome' | 'board' | 'complete';
  tutorialVersion: number;
  lastSavedAt: string;
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
