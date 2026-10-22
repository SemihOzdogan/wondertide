export type ResourceKind = 'driftwood' | 'seaGlass' | 'shell';

export type MergeTile = {
  id: string;
  kind: ResourceKind;
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
  hasSeenIntro: boolean;
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
