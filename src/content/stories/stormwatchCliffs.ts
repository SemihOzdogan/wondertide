import type { StoryChapter } from '../../domain/game';

export const stormwatchCliffs: StoryChapter = {
  id: 'stormwatch-cliffs',
  title: 'Fırtına Kayalıkları',
  location: 'Rüzgâr Burnu',
  theme: 'Kıyı yolunu yeniden açıp fırtınadaki denizcilere güvenli bir işaret ver.',
  introduction: 'Uzak kayalıklarda eski işaret ateşi, yeniden yakılmayı bekliyor.',
  mapIcon: '⛰️',
  tasks: [
    { id: 'secure-cliff-path', title: 'Kayalık yolu güvene al', description: 'Rüzgârın dağıttığı yolu yeniden geçilebilir hâle getir.', requirements: { driftwood: 2, seaGlass: 3, shell: 2 }, reward: { coins: 55 } },
    { id: 'repair-signal-fire', title: 'İşaret ateşini onar', description: 'Geceleri denizcilere yol gösterecek ışığı hazırla.', requirements: { driftwood: 3, seaGlass: 3, shell: 2 }, reward: { coins: 65 } },
    { id: 'raise-storm-banner', title: 'Fırtına sancağını yükselt', description: 'Burnun koruyucu sancağını yerine as ve kıyıyı canlandır.', requirements: { driftwood: 3, seaGlass: 3, shell: 3 }, reward: { coins: 75 } },
  ],
};
