import type { StoryChapter } from '../../domain/game';

export const coralCove: StoryChapter = {
  id: 'coral-cove',
  title: 'Mercan Koyu',
  location: 'Pırıltı Koyu',
  theme: 'Suların altındaki renkleri geri getirip koyun kayıp ezgisini duyur.',
  introduction: 'Dalgalar arasından mercanların rengi yeniden görünmeye başladı.',
  mapIcon: '🪸',
  tasks: [
    { id: 'clear-tide-pools', title: 'Gelgit havuzlarını temizle', description: 'Mercanların nefes alması için kıyıdaki enkazı topla.', requirements: { driftwood: 4, seaGlass: 5, shell: 3 }, reward: { coins: 720, gems: 4 } },
    { id: 'restore-coral-bell', title: 'Mercan çanını onar', description: 'Koyun kayıp melodisini duyuracak eski çanı yeniden kur.', requirements: { driftwood: 6, seaGlass: 5, shell: 4 }, reward: { coins: 980, gems: 6 } },
    { id: 'welcome-the-turtles', title: 'Kaplumbağaları karşıla', description: 'Güvenli bir yuva için son hazırlıkları tamamla.', requirements: { driftwood: 7, seaGlass: 6, shell: 5 }, reward: { coins: 1250, gems: 8 } },
  ],
};
