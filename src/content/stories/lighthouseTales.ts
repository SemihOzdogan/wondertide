import type { StoryChapter } from '../../domain/game';

export const lighthouseTales: StoryChapter = {
  id: 'lighthouse-tales',
  title: 'Kayıp Fener',
  location: 'Serin Kıyı',
  theme: 'Fırtınadan sonra unutulmuş bir kıyı kasabasını yeniden canlandır.',
  introduction: 'Gelgit çekildiğinde, kıyıda eski bir fenerin ışığı yeniden parladı.',
  mapIcon: '🗼',
  tasks: [
    { id: 'clear-garden', title: 'Bahçeyi temizle', description: 'Yolun önündeki yosunları ve enkazı kaldır.', requirements: { driftwood: 1, seaGlass: 1, shell: 1 }, reward: { coins: 120 } },
    { id: 'restore-pier', title: 'İskeleyi onar', description: 'Kasabaya gelen ilk tekne için iskeleyi hazırla.', requirements: { driftwood: 2, seaGlass: 1, shell: 1 }, reward: { coins: 250, gems: 2 } },
  ],
};
