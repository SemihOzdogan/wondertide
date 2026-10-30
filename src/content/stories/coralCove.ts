import type { StoryChapter } from '../../domain/game';

export const coralCove: StoryChapter = {
  id: 'coral-cove',
  title: 'Mercan Koyu',
  location: 'Pırıltı Koyu',
  theme: 'Suların altındaki renkleri geri getirip koyun kayıp ezgisini duyur.',
  introduction: 'Dalgalar arasından mercanların rengi yeniden görünmeye başladı.',
  mapIcon: '🪸',
  tasks: [
    { id: 'clear-tide-pools', title: 'Gelgit havuzlarını temizle', description: 'Mercanların nefes alması için kıyıdaki enkazı topla.', requirements: { driftwood: 2, seaGlass: 2, shell: 1 }, reward: { coins: 45 } },
    { id: 'restore-coral-bell', title: 'Mercan çanını onar', description: 'Koyun kayıp melodisini duyuracak eski çanı yeniden kur.', requirements: { driftwood: 2, seaGlass: 2, shell: 2 }, reward: { coins: 55 } },
    { id: 'welcome-the-turtles', title: 'Kaplumbağaları karşıla', description: 'Güvenli bir yuva için son hazırlıkları tamamla.', requirements: { driftwood: 3, seaGlass: 2, shell: 2 }, reward: { coins: 65 } },
  ],
};
