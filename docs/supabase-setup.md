# Supabase kurulumu

## 1. Proje

Supabase Dashboard'da `wondertide-merge-tales` adlı ücretsiz bir proje oluştur.
Ardından **SQL Editor**'de [ilk şema migration'ını](../supabase/migrations/20261022000000_initial_schema.sql) çalıştır.

Bu şema, her oyuncunun kaydını `players/{user-id}` mantığında saklar. Row Level
Security sayesinde kullanıcı yalnızca kendi satırını okuyabilir veya yazabilir.

## 2. Kimlik doğrulama

Authentication > Providers altında şu sağlayıcıları etkinleştir:

1. **Anonymous Sign-Ins** — oyuncu ilk açılışta misafir başlar.
2. **Email** — e-posta doğrulamasını açık tut.
3. **Google** — Google Cloud OAuth istemcisini daha sonra ekle.
4. **Apple** — iOS yayınından önce Apple Developer kimlik bilgilerini ekle.

Authentication > Settings'de **Manual linking** özelliğini aç. Böylece anonim
oyuncu, ilerlemesini kaybetmeden e-posta, Google veya Apple kimliği bağlayabilir.

Anonim girişleri CAPTCHA/Turnstile ile koru. Oyun yayınlanmadan önce, 30 günden
eski anonim ve hiç bağlanmamış hesapları temizleyen zamanlanmış bir görev ekle.

## 3. Uygulama bağlantısı

Dashboard'daki Connect ekranından iki değeri al:

- Project URL
- Publishable key (veya anon key)

Bu anahtar istemci uygulamasında bulunabilir; **service_role** anahtarını asla
mobil uygulamaya koyma. Değerleri ilerleme adımında uygulama yapılandırmasına
ekleyeceğiz.

Google ve Apple OAuth için kullanılacak derin bağlantı adresi:

`wondertide://auth/callback`

Bu adresi Auth > URL Configuration içine ekleyeceğiz. Android ve iOS tarafında
aynı URL şemasını ayrıca tanımlamak gerekecek.

## 4. Sağlayıcıları yayın öncesi bağlama

Google ve Apple düğmeleri uygulamada hazırdır; bunları çalıştırmadan önce ilgili
OAuth kimlik bilgilerini Supabase'de Providers altında tanımla. Ardından Auth >
URL Configuration altında `wondertide://auth/callback` adresini izin verilen
redirect URL olarak ekle.
