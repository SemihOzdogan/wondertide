import { storyChapters } from '../src/content/stories';

test('publishes exactly ten ordered story chapters with unique ids and tasks', () => {
  expect(storyChapters).toHaveLength(10);
  expect(new Set(storyChapters.map(chapter => chapter.id)).size).toBe(10);

  const taskIds = storyChapters.flatMap(chapter => chapter.tasks.map(task => task.id));
  expect(new Set(taskIds).size).toBe(taskIds.length);
  expect(storyChapters[9].id).toBe('aurora-cape');
});
