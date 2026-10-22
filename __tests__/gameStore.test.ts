import { lighthouseTales } from '../src/content/stories/lighthouseTales';
import { useGameStore } from '../src/store/gameStore';

beforeEach(() => {
  useGameStore.setState({
    inventory: { driftwood: 20, seaGlass: 20, shell: 20 },
    coins: 0,
    gems: 0,
    storyProgress: {
      chapterId: 'lighthouse-tales',
      unlockedChapterIds: ['lighthouse-tales'],
      completedTaskIds: [],
      restoredAreaIds: [],
    },
  });
});

test('does not allow completing a later task before the active task', () => {
  const completed = useGameStore.getState().completeTask(lighthouseTales.tasks[1]);

  expect(completed).toBe(false);
  expect(useGameStore.getState().storyProgress.completedTaskIds).toEqual([]);
});

test('unlocks the next chapter when the current chapter is completed', () => {
  expect(useGameStore.getState().completeTask(lighthouseTales.tasks[0])).toBe(true);
  expect(useGameStore.getState().completeTask(lighthouseTales.tasks[1])).toBe(true);

  expect(useGameStore.getState().storyProgress.completedTaskIds).toEqual([
    'clear-garden',
    'restore-pier',
  ]);
  expect(useGameStore.getState().storyProgress.unlockedChapterIds).toContain('moonlit-harbor');
});
