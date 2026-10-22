import { lighthouseTales } from '../src/content/stories/lighthouseTales';
import { storyChapters } from '../src/content/stories';
import { getEndlessProject, useGameStore } from '../src/store/gameStore';

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

test('merging two equal tiles upgrades the tile instead of immediately adding inventory', () => {
  useGameStore.setState({
    board: [
      { id: 'wood-one', kind: 'driftwood', level: 1 },
      { id: 'wood-two', kind: 'driftwood', level: 1 },
      ...Array(28).fill(null),
    ],
    inventory: { driftwood: 0, seaGlass: 0, shell: 0 },
  });

  expect(useGameStore.getState().mergeTiles('wood-one', 'wood-two')).toBe(true);
  expect(useGameStore.getState().board[0]).toBeNull();
  expect(useGameStore.getState().board[1]).toMatchObject({ id: 'wood-two', kind: 'driftwood', level: 2 });
  expect(useGameStore.getState().inventory.driftwood).toBe(0);
});

test('does not merge tiles with different levels', () => {
  useGameStore.setState({
    board: [
      { id: 'wood-one', kind: 'driftwood', level: 1 },
      { id: 'wood-two', kind: 'driftwood', level: 2 },
      ...Array(28).fill(null),
    ],
  });

  expect(useGameStore.getState().mergeTiles('wood-one', 'wood-two')).toBe(false);
});

test('delivers one project piece when a level-three tile is placed in the task', () => {
  useGameStore.setState({
    board: [
      { id: 'shell-one', kind: 'shell', level: 3 },
      ...Array(29).fill(null),
    ],
    inventory: { driftwood: 0, seaGlass: 0, shell: 0 },
  });

  expect(useGameStore.getState().deliverProjectTile('shell-one')).toBe(true);
  expect(useGameStore.getState().inventory.shell).toBe(1);
  expect(useGameStore.getState().board[0]).toBeNull();
});

test('does not merge completed project pieces', () => {
  useGameStore.setState({
    board: [
      { id: 'shell-one', kind: 'shell', level: 3 },
      { id: 'shell-two', kind: 'shell', level: 3 },
      ...Array(28).fill(null),
    ],
  });

  expect(useGameStore.getState().mergeTiles('shell-one', 'shell-two')).toBe(false);
});

test('uses the visible generation queue instead of selecting the task requirement', () => {
  useGameStore.setState({
    board: Array(30).fill(null),
    energy: 20,
    generatedTileCount: 0,
    generationQueue: ['shell', 'seaGlass', 'driftwood'],
    inventory: { driftwood: 0, seaGlass: 0, shell: 0 },
  });

  useGameStore.getState().generateTile();
  useGameStore.getState().generateTile();
  useGameStore.getState().generateTile();

  expect(useGameStore.getState().board.slice(0, 3).map(tile => tile?.kind)).toEqual([
    'shell',
    'seaGlass',
    'driftwood',
  ]);
});

test('refills the next-resource preview when a generation batch is exhausted', () => {
  useGameStore.setState({
    board: Array(30).fill(null),
    energy: 20,
    generatedTileCount: 0,
    generationQueue: ['driftwood'],
  });

  useGameStore.getState().generateTile();
  const previewedResource = useGameStore.getState().generationQueue[0];
  useGameStore.getState().generateTile();

  expect(previewedResource).toBeDefined();
  expect(useGameStore.getState().board[1]?.kind).toBe(previewedResource);
});

test('creates an increasingly repeatable project after the story is finished', () => {
  const completedTaskIds = storyChapters.flatMap(chapter => chapter.tasks.map(task => task.id));
  const firstContract = getEndlessProject(0);
  useGameStore.setState({
    endlessProjectCount: 0,
    inventory: { driftwood: 2, seaGlass: 2, shell: 2 },
    storyProgress: {
      chapterId: 'stormwatch-cliffs',
      unlockedChapterIds: storyChapters.map(chapter => chapter.id),
      completedTaskIds,
      restoredAreaIds: completedTaskIds,
    },
  });

  expect(useGameStore.getState().completeEndlessProject(firstContract)).toBe(true);
  expect(useGameStore.getState().endlessProjectCount).toBe(1);
  expect(getEndlessProject(3).requirements).not.toEqual(firstContract.requirements);
});
