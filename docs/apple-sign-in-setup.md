# Apple ile giriş kurulumu

Uygulama, iOS'un yerel **Sign in with Apple** ekranını açar ve Apple'ın verdiği
kimlik belirtecini Supabase'e gönderir. Bu nedenle yayın öncesinde aşağıdaki iki
panoda da ayar yapılmalıdır.

## 1. Apple Developer

1. Apple Developer > Certificates, Identifiers & Profiles > Identifiers bölümünde
   `com.wondertide.mergetales` App ID'sini aç.
2. **Sign in with Apple** yeteneğini etkinleştir ve kaydet.
3. Dağıtım profilini yeniden oluştur veya otomatik imzalama kullanılıyorsa Xcode'un
   yeni yetkiyi almasına izin ver.

Projede bu yetki, [Wondertide.entitlements](../ios/Wondertide/Wondertide.entitlements)
dosyasına ve Debug/Release hedeflerine eklenmiştir.

## 2. Supabase

1. Authentication > Providers > **Apple** bölümünü etkinleştir.
2. Apple Developer'da oluşturduğun Sign in with Apple anahtarındaki **Key ID**,
   **Team ID** ve indirilen `.p8` özel anahtarı Supabase'e gir.
3. Uygulamanın Bundle ID'sini `com.wondertide.mergetales` olarak doğrula.
4. Authentication > Settings altında **Manual linking** özelliğini açık tut.

Yerel iOS akışı için web yönlendirmesi gerekmez. `wondertide://auth/callback`
yalnızca e-posta ve eski OAuth yönlendirmeleri için kalır.

## 3. Yayın öncesi deneme

Apple ile giriş, gerçek cihazda test edilmelidir. Yeni bir misafir hesabıyla
"Apple ile kaydol" seçeneğinin mevcut ilerlemeyi koruduğunu; ardından oturumu
kapatıp aynı Apple hesabıyla giriş yapıldığında aynı kaydın açıldığını doğrula.

Apple ad ve e-posta bilgisini ilk yetkilendirmede verir. Sonraki girişlerde
boş dönmesi normaldir; oturum için kimlik belirteci yeterlidir.
