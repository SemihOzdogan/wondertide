import { storyChapters } from '../src/content/stories';

test('publishes twenty ordered story chapters with unique ids and tasks', () => {
  expect(storyChapters).toHaveLength(20);
  expect(new Set(storyChapters.map(chapter => chapter.id)).size).toBe(20);

  const taskIds = storyChapters.flatMap(chapter =>
    chapter.tasks.map(task => task.id),
  );
  expect(new Set(taskIds).size).toBe(taskIds.length);
  expect(storyChapters[9].id).toBe('aurora-cape');
  expect(storyChapters[19].id).toBe('crown-of-tides');
  expect(storyChapters[19].tasks[2].requirements).toEqual({
    driftwood: 18,
    seaGlass: 18,
    shell: 18,
  });
});
