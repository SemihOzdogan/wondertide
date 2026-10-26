import type { StoryChapter } from '../../domain/game';

export const kelpwoodGrove: StoryChapter = {
  id: 'kelpwood-grove',
  title: 'Yosun Ormanı',
  location: 'Zümrüt Kıyısı',
  theme: 'Kıyı ormanının dolaşmış köklerini çözüp saklı geçidi yeniden aç.',
  introduction: 'Gelgit çekilince yosunların altında eski bir taş yol belirdi.',
  mapIcon: '🌿',
  tasks: [
    { id: 'clear-kelp-trail', title: 'Yosun yolunu aç', description: 'Kökler arasındaki yolu yeniden görünür hâle getir.', requirements: { driftwood: 2, seaGlass: 2, shell: 2 }, reward: { coins: 2400, gems: 12 } },
    { id: 'restore-grove-bridge', title: 'Koru köprüsünü onar', description: 'Küçük dere üzerindeki ahşap köprüyü güvenli hâle getir.', requirements: { driftwood: 3, seaGlass: 2, shell: 3 }, reward: { coins: 2750, gems: 14 } },
    { id: 'wake-the-grove', title: 'Koruyu uyandır', description: 'Eski gelgit çanını çalarak koruya yeniden hayat ver.', requirements: { driftwood: 3, seaGlass: 3, shell: 3 }, reward: { coins: 3100, gems: 16 } },
  ],
};

export const sunkenBazaar: StoryChapter = {
  id: 'sunken-bazaar',
  title: 'Batık Çarşı',
  location: 'İnci Geçidi',
  theme: 'Suyun altındaki eski pazarın ışıklarını yakıp kayıp tüccarları evlerine çağır.',
  introduction: 'Berrak suda, deniz kabuklarıyla bezeli bir çarşının çatıları parıldıyor.',
  mapIcon: '🐚',
  tasks: [
    { id: 'sort-market-treasures', title: 'Pazar eşyalarını ayır', description: 'Akıntının taşıdığı değerli eşyaları tezgâhlara geri yerleştir.', requirements: { driftwood: 2, seaGlass: 3, shell: 2 }, reward: { coins: 3350, gems: 16 } },
    { id: 'mend-pearl-awning', title: 'İnci tentesini onar', description: 'Çarşının ana girişindeki inci işlemeli tenteyi yenile.', requirements: { driftwood: 3, seaGlass: 3, shell: 3 }, reward: { coins: 3700, gems: 18 } },
    { id: 'open-bazaar-gates', title: 'Çarşı kapılarını aç', description: 'Eski kapıları kaldır ve çarşının yeniden canlanmasını sağla.', requirements: { driftwood: 3, seaGlass: 3, shell: 4 }, reward: { coins: 4100, gems: 20 } },
  ],
};

export const whisperingReef: StoryChapter = {
  id: 'whispering-reef',
  title: 'Fısıldayan Resif',
  location: 'Mavi Yankı',
  theme: 'Şarkısını kaybeden resifi iyileştirip denizin eski ezgisini geri getir.',
  introduction: 'Dalgaların altında, resifin her köşesinden ince bir melodi yükseliyor.',
  mapIcon: '🐠',
  tasks: [
    { id: 'clean-reef-gardens', title: 'Resif bahçelerini temizle', description: 'Mercanların arasındaki enkazı kaldırarak ışığı geri getir.', requirements: { driftwood: 3, seaGlass: 2, shell: 3 }, reward: { coins: 4400, gems: 20 } },
    { id: 'tune-shell-chimes', title: 'Kabuk çanlarını akort et', description: 'Resifin melodisini taşıyan kabuk çanlarını yeniden düzenle.', requirements: { driftwood: 3, seaGlass: 4, shell: 3 }, reward: { coins: 4850, gems: 22 } },
    { id: 'call-the-reef-choir', title: 'Resif korosunu çağır', description: 'Son notayı tamamla ve deniz canlılarını güvenli yuvalarına çağır.', requirements: { driftwood: 4, seaGlass: 3, shell: 4 }, reward: { coins: 5300, gems: 24 } },
  ],
};

export const tideglassFalls: StoryChapter = {
  id: 'tideglass-falls',
  title: 'Gelgit Camı Şelalesi',
  location: 'Kristal Yarık',
  theme: 'Parçalanmış deniz camı şelalesini onarıp kıyının tatlı su akışını geri getir.',
  introduction: 'Kayalık yarığın içinden akan şelale, deniz camı gibi renkli ışıklar saçıyor.',
  mapIcon: '💎',
  tasks: [
    { id: 'clear-crystal-channel', title: 'Kristal kanalı temizle', description: 'Şelaleye giden kanaldaki taşları ve sürüklenen dalları kaldır.', requirements: { driftwood: 3, seaGlass: 3, shell: 3 }, reward: { coins: 5000, gems: 22 } },
    { id: 'mend-tideglass-wheel', title: 'Gelgit çarkını onar', description: 'Suyu yönlendiren deniz camı çarkını yeniden döndür.', requirements: { driftwood: 3, seaGlass: 4, shell: 3 }, reward: { coins: 5450, gems: 24 } },
    { id: 'release-the-falls', title: 'Şelaleyi serbest bırak', description: 'Son kilidi açarak berrak suyun kıyıya yeniden ulaşmasını sağla.', requirements: { driftwood: 4, seaGlass: 4, shell: 3 }, reward: { coins: 5900, gems: 26 } },
  ],
};

export const starlitAtoll: StoryChapter = {
  id: 'starlit-atoll',
  title: 'Yıldızlı Atol',
  location: 'Göktaşı Adaları',
  theme: 'Gece denizindeki yıldız taşlarını birleştirip kayıp yön işaretlerini yak.',
  introduction: 'Gece çöktüğünde atolün sularında yıldızlar kadar parlak taşlar yüzüyor.',
  mapIcon: '✨',
  tasks: [
    { id: 'gather-star-stones', title: 'Yıldız taşlarını topla', description: 'Kıyıya vuran ışıklı taşları güvenli bir yerde birleştir.', requirements: { driftwood: 3, seaGlass: 3, shell: 4 }, reward: { coins: 5650, gems: 24 } },
    { id: 'repair-sky-compass', title: 'Gök pusulasını onar', description: 'Denizcilerin yıldızlarla yön bulmasını sağlayan pusulayı yenile.', requirements: { driftwood: 4, seaGlass: 4, shell: 3 }, reward: { coins: 6150, gems: 26 } },
    { id: 'light-atoll-beacons', title: 'Atol fenerlerini yak', description: 'Yolculuğun son ışıklarını yakarak bütün kıyıları birbirine bağla.', requirements: { driftwood: 4, seaGlass: 4, shell: 4 }, reward: { coins: 6700, gems: 30 } },
  ],
};

export const auroraCape: StoryChapter = {
  id: 'aurora-cape',
  title: 'Şafak Burnu',
  location: 'Kuzey Işığı Burnu',
  theme: 'Kuzey ışıklarının altında son kıyı sığınağını kur ve Wondertide’ın hikâyesini tamamla.',
  introduction: 'Ufukta şafak renkleri belirirken, bütün yollar son bir kıyıda birleşiyor.',
  mapIcon: '🌅',
  tasks: [
    { id: 'reinforce-cape-shelter', title: 'Burun sığınağını güçlendir', description: 'Kıyı bekçilerinin sığınağını yaklaşan gelgite hazırla.', requirements: { driftwood: 4, seaGlass: 3, shell: 4 }, reward: { coins: 7100, gems: 30 } },
    { id: 'raise-aurora-lens', title: 'Şafak merceğini yükselt', description: 'Kuzey ışıklarını kıyıya yansıtacak dev merceği yerine yerleştir.', requirements: { driftwood: 4, seaGlass: 4, shell: 4 }, reward: { coins: 7700, gems: 34 } },
    { id: 'restore-wondertide', title: 'Wondertide’ı uyandır', description: 'Son ışığı yak ve bütün kıyıların yeniden parlamasını sağla.', requirements: { driftwood: 4, seaGlass: 4, shell: 4 }, reward: { coins: 8500, gems: 40 } },
  ],
};

export const chaptersToCompleteTheStory: StoryChapter[] = [
  kelpwoodGrove,
  sunkenBazaar,
  whisperingReef,
  tideglassFalls,
  starlitAtoll,
  auroraCape,
];
