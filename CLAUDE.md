# Life Assistant — Proje Bağlamı

Bu dosya Claude Code için proje talimatlarını içerir. Detaylı vizyon ve yol haritası için `docs/life-assistant-proje-dokumani.md` dosyasını oku.

## Proje Özeti

Kişisel yaşam asistanı uygulaması. Dört sütun: bütçe, film takibi, seyahat planlama, takvim. Farklılaştırıcı çekirdek özellik: **İstek Listesi → Tasarruf Hedefi → Bütçe döngüsü** (kullanıcı bir hedefi ve tarihini girer, uygulama aylık biriktirme tutarını hesaplar ve gider kalemi olarak bütçeye ekler).

## MVP Kapsamı (ŞU ANDA SADECE BUNU YAPIYORUZ)

1. Kişisel bütçe temel modülü: gelir kaydı (maaş günü otomatik yenileme), standart giderler (haftalık/aylık/yıllık periyot), aylık özet görünümü
2. İstek listesi (harcama + seyahat hedefleri) → tasarruf hedefi → aylık gider kalemine dönüştürme döngüsü
3. Basit hatırlatma altyapısı

Film, seyahat detayı, takvim entegrasyonu, ortak masraf paylaşımı = sonraki fazlar. MVP dışına çıkma, kullanıcı istese bile önce kapsam genişlemesi olduğunu hatırlat.

**Durum (2026-07-11):** MVP + cila tamamlandı, Netlify'da yayında (lifeassistantai.netlify.app; ev ISS'i netlify.app'i engelliyor, GitHub Pages yapılandırması hazır bekliyor). Faz 2 film modülü bitti (izleme listesi, 5 yıldız puanlama, OMDb/IMDb arama + puan rozetleri, türler/filtre, zevk profili, Keşfet önerileri, film günü hatırlatmaları). Takvim modülü v1 bitti: yaşam kategorileri (emoji + haftalık hedef), haftalık yapıldı/yapılmadı takibi, Ajanda (tüm modüllerin hatırlatmaları tarih tarih). Limit asistanı bitti: transactions tablosu (günlük harcama günlüğü, planlı bütçeden ayrı), hızlı harcama girişi, günlük güvenli harcama + hız (pace) uyarıları, Özet kartında gerçek kalan. Sayfalar route-level code-splitting ile ayrı chunk'larda. **Faz 2 tamam.** Ardından aile paylaşımı (aşağıda) ve Takvim v2 (aşağıda) tamamlandı. Sırada: Faz 3 seyahat modülü, ortak harcama dengesi, ya da cila (TMDB anahtarı gelince vizyondakiler + Türkçe arama).

**Çalışma düzeni:** Kaynak GitHub (`srknctnr/LifeAssistant`), kullanıcı farklı bilgisayarlardan çalışıyor. Her oturuma `git pull` ile başla, her anlamlı adımda commit + push et. `.env.local` git'e girmez; her makinede elle oluşturulur (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OMDB_KEY, opsiyonel VITE_TMDB_TOKEN). Gerçek anahtarlar asla `.env.example`'a yazılmaz.

**Kullanıcıda bekleyenler:** SQL Editor'de `20260818020000_harden_shared_expenses.sql` (Ortak Kasa sertleştirme; 20260724010000 ve 20260818010000 uygulandı). İsteğe bağlı TMDB "API Read Access Token". (Aile SQL'leri 20260720010000 + 20260720020000 uygulandı, kullanıcı 2026-07-24'te çalıştığını doğruladı.)

**Aile özelliği (yeniden tasarlandı — kullanıcı geri bildirimiyle):** çoklu grup destekli aileler; kod tabanlı davet (e-posta eşleşmeli, 7 gün, RPC accept_family_invite); profiles (görünen ad) üyelik önkoşulu. Paylaşım seviyeleri module_shares'ta modül başına **Kapalı / Özet (yalnız bütçe) / Sor / Tam**. Veri modeli: 6 kayıt tablosunda `is_family_visible` bayrağı + `record_shared_with_me()` definer fonksiyonu üzerinden aile SELECT policy'leri (Tam→tüm satırlar, Sor→yalnız bayraklı satırlar, Özet→satır yok, sadece family_budget_summary RPC toplamları; çocuk kayıtlar — hedef/katkı/takvim girişleri — ebeveyn bayrağını izler). UI: alt menüde 6. sekme **Ailem** → Segmented "Aile Özeti | Yönetim". Aile Özeti = canlı toplanan ortak alan (kopya yok): aile bütçesi pace kartı + üye çipli harcama listesi, ortak hedefler/istekler, aile film listesi (ekleyen çipli, izlenecek+izlenen), haftalık takvim. Formlarda Sor seviyesinde "Sadece ben | Aile ile" seçimi (film arama/keşfette kompakt toggle); Tam seviyede otomatik senkron. Ana sayfada dört modül kartında da (Bütçe, Hedefler, Filmler, Takvim) Kişisel/Aile anahtarı (localStorage la-card-budget / la-card-goals / la-card-movies / la-card-calendar; aile kartları /family'ye gider). Kendi sayfa sorguları currentUserId ile sabit; aile alanında kendi satırlarım kendi seviyeme göre client-side filtrelenir (visibleRows). Kullanıcı 2026-07-24'te uçtan uca doğruladı. **Sırada:** ortak harcama dengesi (Tricount tarzı) aile alanına eklenecek.

**Ortak Kasa — Tricount tarzı ortak harcama (bitti, 2026-08-18):** kullanıcı isteği: "ortak harcama sadece aile içi değil, farklı insanlarla da grup kurabildiğin şekilde". Grup ilkeli olarak MEVCUT `families` tablosu kullanılıyor (zaten çok gruplu: aile, ev arkadaşları, tatil ekibi) — ikinci bir grup kavramı yok; değişen yalnız UI dili: 6. sekme "Ailem" → **"Gruplar"**, sayfa başlığı "Gruplarım", Segmented artık üç: **Özet | Ortak Kasa | Yönetim**. Şema (20260818010000): `families.currency`, `shared_expenses` (başlık + tutar + ödeyen + tarih + kategori + split_mode equal|amount), `expense_shares` (kişi başı pay; composite FK ile family_id satırda taşınıyor, RLS join yapmıyor), `expense_settlements` (ödeşme = nakit transferi, tüketim değil). Payların toplamı = tutar kuralı **deferred constraint trigger** ile COMMIT anında zorlanıyor; kayıt `save_shared_expense` RPC'siyle (security invoker, RLS geçerli) tek transaction'da başlık+paylar olarak yazılıyor. Bakiye saklanmıyor, istemcide türetiliyor: `split-math.ts` (kuruş tabanlı splitEvenly/splitByWeight/computeBalances/settleUp) + `ledger.ts` (buildLedgerView, equalShares, ledgerParticipants) — 24 test. Gruptan ayrılan üye borçlu kalabilir diye `is_group_participant` hem ödeşmelerde hem harcamalarda geçerli (yabancıya kapalı: kişi zaten o grubun defterinde görünüyor olmalı) ve istemcide `ledgerMembers` eski üyeleri "Eski üye · ayrıldı" olarak formlara da veriyor — aksi hâlde ayrılan birinin olduğu harcama bir daha düzenlenemiyor, borcu da kapatılamıyordu. **Kişisel bütçeye otomatik yazım YOK** (çift sayım riski): ortak harcama kişisel transactions tablosuna dokunmuyor. Uygulama sonrası çok yönlü RLS/SQL incelemesi yapıldı ve dört bulgu 20260818020000 ile kapatıldı: (1) expense_shares pin trigger yoktu ve toplam kontrolü UPDATE'te yalnız hedef harcamayı doğruluyordu — tek bir PATCH ile pay başka harcamaya taşınıp kaynak sessizce eksik kalabiliyordu; (2) is_group_member/is_group_participant security definer + rastgele user_id alıyor ve varsayılan PUBLIC EXECUTE yüzünden **anon anahtarla çağrılabiliyordu** (canlıda doğrulandı) — artık yalnız authenticated/service_role; (3) save_shared_expense düzenlemede tüm payları silip yeniden yazdığı için ayrılmış üyenin tek izi o harcamaysa kendi kontrolüne takılıyordu — artık yalnız listede olmayanlar siliniyor, kalanlar upsert ediliyor; (4) is_group_participant ödeşmelere bakmıyordu, istemci ise bakıyordu. Sonraki dilim adayları: kendi payını tek dokunuşla kişisel harcamaya yazma, ağırlıklı bölüşme (splitByWeight hazır), grup para birimi seçimi, harcama kategorisi dökümü.

**Takvim v2 (bitti, 2026-07-24):** tek takvim hafta⇄ay geçişli (Segmented), seçili günün planları hemen altında; `events` tablosu (kind 'general'|'movie', starts_on + opsiyonel starts_at, note, movie_id, is_family_visible; `events_movie_requires_movie_kind` check + `events_user_movie_unique` kısmi tekil indeks). Etkinlikler `planEventReminders` ile hatırlatma üretir (idempotent; taşınan/silinen etkinliğin hatırlatması dismiss edilir, geçmiş tarihler atlanır). **Film senkronu tek yönlü:** etkinlik kazanır — movie-kind etkinlik `movies.planned_for`'u yazar, MovieForm'daki tarih alanı bağlıyken (ve events sorgusu yanıtlanana kadar) salt-okunur, böylece tek yazar var. **Hatırlatma sahipliği etkinlikte kalır:** `eventOwnedMovieIds(events)` kümesi `planMovieReminders`'a verilir; etkinliğin sahiplendiği filme film-hatırlatması üretilmez (varsa dismiss edilir). Film seçmek/kaldırmak sahipliği devretmez — devretseydi programatik olarak dismiss edilen hatırlatma bir daha geri gelemezdi (tekil indeks + ignoreDuplicates). Filmi seçilmemiş film gecesi Filmler sekmesinde öneri bandı çıkarır; oradan seçim etkinliği bağlar. Etkinlikler `calendar` modülü altında paylaşılır (ayrı module_shares tipi yok) ve Ailem → Aile Özeti'nde "Aile takvimi" bölümünde ekleyen çipiyle görünür. Saf yardımcılar: month-math (monthGrid/addMonths/isSameMonth) ve event-day (sortDayEvents/eventsOnDay/busyDates), ikisi de testli. Hatırlatma senkronu artık mount başına bir kez değil, veri değiştikçe çalışıyor (planlar idempotent; uygulanan plan bir sonrakini boşaltır) — aynı ziyarette eklenen ikinci etkinlik de hatırlatma alıyor. Events sorgusu hata verirse (ör. migration uygulanmadan) etkinlik planlayıcısı tamamen atlanıyor; "hepsi silinmiş" sanıp canlı hatırlatmaları dismiss etmesi böyle engellendi. Bilinen sınırlar: reminders.due_on tarih bazlı, saat hatırlatma başlığında taşınıyor; etkinlik adı/filmi değişince mevcut hatırlatmanın başlığı bayat kalır (filmlerde de aynı davranış); bir etkinliğin tarihi değiştirilip **aynı tarihe geri alınırsa** eski hatırlatma dismissed kaldığı için geri gelmez (filmlerdeki planned_for davranışıyla aynı).

## Teknoloji Yığını

- **Frontend:** React + Vite, mobil öncelikli PWA (vite-plugin-pwa)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Deploy:** Netlify
- **AI katmanı (Faz 4):** Claude API — şimdilik kurma
- **Stil:** Tailwind CSS + Framer Motion (animasyonlar için)

## Tasarım Dili — ÖNEMLİ

Kullanıcı (Serkan) premium, modern, motion-rich arayüzleri tercih eder:

- Statik/sıkıcı formlar YOK — spring animasyonlu sayılar, staggered giriş animasyonları, hover efektleri, akışkan geçişler
- Apple / premium ürün estetiği; "gaming UI" neon estetiği DEĞİL
- Temiz, minimal, az renk; boşluk kullanımı cömert
- Mobil öncelikli tasarla (375px genişlik referans), sonra desktop

## Veri Modeli (v1 — 2026-07-06'da birlikte kararlaştırıldı)

Şema `supabase/migrations/20260706010000_initial_schema.sql` dosyasında. Tablo/kolon adları İngilizce.

- `incomes`: name, amount, currency, salary_day, auto_renew
- `expense_items`: name, amount, currency, period (weekly|monthly|yearly), category, source (manual|savings_goal), is_active
- `wishlist_items`: name, kind (purchase|travel), estimated_amount, currency, target_date, status
- `savings_goals`: wishlist_item_id (unique), target_amount (dönüşümde sabitlenir), monthly_amount, start_date, expense_item_id, status
- `savings_contributions`: savings_goal_id, amount, contributed_on, note — biriken tutar bu ledger'ın toplamı
- `reminders`: title, due_on, source_type, source_id, status — MVP'de yalnızca uygulama içi

Alınan kararlar:

- Para: `numeric(12,2)` + ISO `currency` kolonu (varsayılan 'TRY')
- Her tabloda RLS aktif, politika: `user_id = auth.uid()` (her işlem için ayrı policy)
- `updated_at` trigger'la güncellenir
- Auth: e-posta+şifre ve Google OAuth birlikte
- Push bildirimi Faz 2; MVP'de hatırlatmalar uygulama içi

## Çalışma Kuralları

- Dil: Kullanıcıyla Türkçe konuş; kod, değişken adları ve commit mesajları İngilizce
- Her anlamlı adımda git commit at
- Karmaşık kararlarda önce seçenekleri sun, sonra uygula
- Supabase şema değişikliklerini migration dosyası olarak tut
