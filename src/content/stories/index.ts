import type { StoryChapter } from '../../domain/game';
import { lighthouseTales } from './lighthouseTales';
import { moonlitHarbor } from './moonlitHarbor';
import { coralCove } from './coralCove';
import { stormwatchCliffs } from './stormwatchCliffs';
import { chaptersToCompleteTheStory } from './tideboundStories';

// New story packs are registered here. The game UI only relies on StoryChapter.
export const storyChapters: StoryChapter[] = [
  lighthouseTales,
  moonlitHarbor,
  coralCove,
  stormwatchCliffs,
  ...chaptersToCompleteTheStory,
];
