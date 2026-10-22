import type { StoryChapter } from '../../domain/game';

export const moonlitHarbor: StoryChapter = {
  id: 'moonlit-harbor',
  title: 'Ay Işığındaki Liman',
  location: 'Lunara Limanı',
  theme: 'Ay ışığının altında uyuyan limanı yeniden canlandır.',
  introduction: 'Uzakta bir çan çalıyor. Limanın sisleri arasından yeni bir hikâye beliriyor.',
  mapIcon: '🌙',
  tasks: [
    { id: 'light-lanterns', title: 'Fenerleri yak', description: 'Liman yolunu aydınlatmak için eski fenerleri onar.', requirements: { driftwood: 2, seaGlass: 4, shell: 3 }, reward: { coins: 360, gems: 3 } },
    { id: 'wake-harbor', title: 'Limanı uyandır', description: 'İlk gece teknesi için rıhtımı hazırla.', requirements: { driftwood: 5, seaGlass: 4, shell: 2 }, reward: { coins: 600, gems: 5 } },
  ],
};
