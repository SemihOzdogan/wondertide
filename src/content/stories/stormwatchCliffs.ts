import type { StoryChapter } from '../../domain/game';

export const stormwatchCliffs: StoryChapter = {
  id: 'stormwatch-cliffs',
  title: 'Fırtına Kayalıkları',
  location: 'Rüzgâr Burnu',
  theme: 'Kıyı yolunu yeniden açıp fırtınadaki denizcilere güvenli bir işaret ver.',
  introduction: 'Uzak kayalıklarda eski işaret ateşi, yeniden yakılmayı bekliyor.',
  mapIcon: '⛰️',
  tasks: [
    { id: 'secure-cliff-path', title: 'Kayalık yolu güvene al', description: 'Rüzgârın dağıttığı yolu yeniden geçilebilir hâle getir.', requirements: { driftwood: 6, seaGlass: 7, shell: 4 }, reward: { coins: 1400, gems: 8 } },
    { id: 'repair-signal-fire', title: 'İşaret ateşini onar', description: 'Geceleri denizcilere yol gösterecek ışığı hazırla.', requirements: { driftwood: 8, seaGlass: 7, shell: 6 }, reward: { coins: 1750, gems: 10 } },
    { id: 'raise-storm-banner', title: 'Fırtına sancağını yükselt', description: 'Burnun koruyucu sancağını yerine as ve kıyıyı canlandır.', requirements: { driftwood: 9, seaGlass: 8, shell: 7 }, reward: { coins: 2150, gems: 12 } },
  ],
};
