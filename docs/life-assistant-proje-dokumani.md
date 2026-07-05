# Life Assistant — Proje Dokümanı v1.0

_Konsolidasyon tarihi: 6 Temmuz 2026 · Sahibi: Serkan_

---

## 1. Vizyon

Kişinin günlük yaşamını dört alanda tek çatı altında yöneten, **AI-native** bir kişisel asistan uygulaması: takvim/yaşam planlaması, film & etkinlik takibi, seyahat planlama ve kişisel bütçe. Uygulamanın farkı özelliklerin kendisinde değil, **aralarındaki bağ dokusunda**: film listesi takvime, seyahat planı bütçeye, ortak masraflar kişisel bütçeye akar.

**Çekirdek kama (wedge):** İstek Listesi → Tasarruf Hedefi → Bütçe döngüsü. Kullanıcı bir hedefi (gezi, satın alma) ne zaman gerçekleştirmek istediğini girer; uygulama aylık biriktirmesi gereken tutarı hesaplar ve isterse bunu otomatik olarak aylık gider kalemine ekler. Bu döngü mevcut pazarda hiçbir üründe bütünleşik olarak yok.

---

## 2. Dört Sütun ve Özellikler

### 2.1 Takvim & Yaşam Planlaması

- Google Calendar entegrasyonu birincil hedef (her yerde erişilebilir olduğu için); entegrasyon olmazsa uygulama içi takvim sistemi.
- Google'ın kaldırdığı "Goals" benzeri, ama basit tutulmuş **yaşam kategorileri**: film izleme, arkadaşlarla sosyalleşme, spor, gezilecek yerler gibi etiketler.
- Kategorilere "yapıldı / yapılmadı" durumu (filmde izledim/izlemedim gibi).
- Diğer sütunlardan gelen otomatik hatırlatmalar bu takvime düşer (film günü, tatil ödeme tarihi, tasarruf kontrolü).

### 2.2 Film Takibi

- İzleme listesi: izledim / izlemedim durumu, ekleme-çıkarma.
- **Vizyondaki ve yakında çıkacak filmleri tarama** → kullanıcıya öneri akışı → "izlemek istiyorum" ile listeye ekleme.
- Listeye eklenen filmler için **film günü otomatik hatırlatması** (takvim sütunuyla entegre).
- Basit film puanlama sistemi (5 yıldız / 10 puan).
- _Sonraki faz:_ beğenilere göre kişiselleştirilmiş film önerisi (ayrı modül, hatta ayrı uygulama olabilir).
- Veri kaynağı adayı: TMDB API (vizyon + yakında çıkacaklar + Türkçe destek), streaming erişilebilirliği için JustWatch verisi.

### 2.3 Seyahat Planlama

- Öneri motoru değil, **düzenli bir not defteri / planlama alanı**: destinasyon, tarih, konaklama, aktiviteler.
- Planlanan harcama tutarları girilir; tatil planı takvime işlenir; otomatik hatırlatmalar oluşur.
- **Ortak plan**: seyahat diğer kişilerle paylaşılabilir, birlikte düzenlenebilir.
- **Ortak bütçe (Tricount modeli)**: her katılımcı harcamayı anlık girer, kim ödedi / kime borç kaydı tutulur, gün sonunda tüm borçları eşitleyip kişilere dağıtan settlement hesabı yapılır.
- **Seyahat istek listesi**: gidilmek istenen yerler + ortalama planlanan bütçe (çekirdek kamaya girdi sağlar).

### 2.4 Kişisel Bütçe

- Aylık gelir kaydı; **maaş gününde otomatik yenilenen** gelir; ek gelir ekleme; her maaş kalemi ayrı ayrı düzenlenebilir, kullanıcı önden planlayabilir.
- Standart harcamaların haftalık / aylık / yıllık periyotlarla planlanması.
- Uygulamanın görevi: **aylık raporlar**, günlük/haftalık harcama limitleri, limitlere göre **asistan gibi proaktif destek** (PocketGuard "Pace" benzeri: "bu hızla ay sonunu getiremezsin" uyarıları).
- **Harcama istek listesi** (satın alınmak istenen şeyler + hedef tarih).
- **Çekirdek döngü**: istek listesi hedef tarihi → aylık biriktirme tutarı hesabı → onayla aylık gider kalemine otomatik ekleme.
- Seyahat sütunundaki ortak masraflardan kişiye düşen pay, kişisel bütçeye yansır.

---

## 3. Bağ Dokusu — Uygulamayı Özel Kılan Entegrasyonlar

| Akış                                                | Mevcut pazarda var mı?                              |
| --------------------------------------------------- | --------------------------------------------------- |
| Film listesi → takvimde film günü hatırlatması      | Yok (Letterboxd sadece streaming bildirimi yapıyor) |
| Seyahat planı → kişisel bütçede tasarruf kalemi     | Yok (Wanderlog vb. seyahat-silosu)                  |
| Ortak masraf (settlement) → kişisel bütçe yansıması | Yok (Tricount/Splitwise kişisel bütçeden kopuk)     |
| İstek listesi → aylık biriktirme → gider kalemi     | Yok — en özgün fikir                                |

---

## 4. Literatür Taraması Özeti (Haziran–Temmuz 2026)

- **Takvim:** Google Calendar + Gemini güçlü; yaşam kategorileri (eski "Goals") boşluğu duruyor.
- **Film:** Letterboxd lider (watchlist, puanlama, ücretli üyelere streaming bildirimi); JustWatch "nerede izlenir", Trakt liste gücü, Matinee film+dizi. Takvim entegrasyonu kimsede yok.
- **Seyahat:** Wanderlog lider (itinerary + bütçe + grup + harita); TripIt e-posta otomasyonu; Stippl yükselen. Kişisel bütçe bağlantısı kimsede yok.
- **Bütçe:** Monarch (AI asistan, ortak hedefler), PocketGuard (Pace uyarıları). Paylaşımda Tricount ücretsiz/basit ama bunq sonrası senkron şikâyetleri var; Splitwise paralı duvara çekiliyor.
- **Süper uygulama dersi:** Batı pazarlarında "her şey uygulaması" başarısız oluyor; işe yarayanlar tek davranıştan başlayıp genişleyenler. Gelecekteki muhtemel süper uygulama, tek bir AI beyni olabilir → AI-native kurgu hem savunma hem fırsat.

---

## 5. Pazar Değerlendirmesi

- **Türkiye lokalizasyonu savunulabilir niş:** TL bütçe, Türk vizyon takvimi, Türkçe arayüz — global liderlerin zayıf noktası.
- **Monetizasyon zor:** kategori ücretsize kayıyor. Gerçekçi model: freemium — çekirdek ücretsiz; AI özellikleri, çoklu kişili geziler, gelişmiş raporlar ücretli.
- **Konumlandırma:** "her şey uygulaması" olarak değil, çekirdek kama (istek listesi–tasarruf–bütçe döngüsü) üzerinden lansman; diğer sütunlar bu çekirdeğin etrafına örülür.

---

## 6. Önceliklendirme (Taslak Yol Haritası)

**MVP (Faz 1) — çekirdek döngü:**

1. Kişisel bütçe temel modülü (gelir, standart giderler, aylık görünüm)
2. İstek listesi (harcama + seyahat) → tasarruf hedefi → gider kalemi döngüsü
3. Basit hatırlatma/bildirim altyapısı

**Faz 2 — yaşam katmanı:** 4. Film izleme listesi + vizyon taraması + film günü hatırlatması 5. Takvim entegrasyonu (Google Calendar) + yaşam kategorileri 6. Günlük/haftalık limit asistanı (proaktif uyarılar)

**Faz 3 — sosyal katman:** 7. Seyahat planlayıcı (not defteri modeli) + takvim/bütçe bağları 8. Ortak seyahat + Tricount tarzı masraf paylaşımı ve settlement 9. Ortak masraf → kişisel bütçe yansıması

**Faz 4 — akıl katmanı:** 10. AI asistan kabuğu (doğal dille giriş: "cuma sinemaya gidiyoruz, 600 TL bütçem var" → otomatik kayıt + hatırlatma) 11. Beğeniye göre film önerisi 12. Aylık AI raporları / içgörüler

---

## 7. Teknik Notlar (Ön Fikirler)

- Serkan'ın mevcut yetkinlikleri: React/JSX, Claude API entegrasyonu, Google Sheets/Apps Script backend, Netlify dağıtımı (Seren projesi deneyimi).
- MVP için pragmatik yığın: React (mobil öncelikli web/PWA) + Supabase veya Firebase backend + Claude API (AI katmanı) + TMDB API (film verisi) + Google Calendar API.
- Tasarım dili: premium, modern, motion-rich — Serkan'ın tercih ettiği estetik çizgi.

---

## 8. Açık Sorular

- Google Calendar entegrasyonu mu, uygulama içi takvim mi öncelikli? (Hibrit: içeride tut, Google'a senkronla?)
- Platform: PWA mı, React Native ile native mobil mi?
- Ortak masraf modülünde hesap zorunluluğu olacak mı? (Tricount'un hesapsız kullanımı büyük artı.)
- Bildirimlerin push altyapısı (PWA push vs native).
- Uygulama adı ve marka kimliği.

---

_Bu doküman yaşayan bir belgedir; yeni fikirler geldikçe güncellenir._
