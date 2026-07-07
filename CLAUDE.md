# Life Assistant — Proje Bağlamı

Bu dosya Claude Code için proje talimatlarını içerir. Detaylı vizyon ve yol haritası için `docs/life-assistant-proje-dokumani.md` dosyasını oku.

## Proje Özeti

Kişisel yaşam asistanı uygulaması. Dört sütun: bütçe, film takibi, seyahat planlama, takvim. Farklılaştırıcı çekirdek özellik: **İstek Listesi → Tasarruf Hedefi → Bütçe döngüsü** (kullanıcı bir hedefi ve tarihini girer, uygulama aylık biriktirme tutarını hesaplar ve gider kalemi olarak bütçeye ekler).

## MVP Kapsamı (ŞU ANDA SADECE BUNU YAPIYORUZ)

1. Kişisel bütçe temel modülü: gelir kaydı (maaş günü otomatik yenileme), standart giderler (haftalık/aylık/yıllık periyot), aylık özet görünümü
2. İstek listesi (harcama + seyahat hedefleri) → tasarruf hedefi → aylık gider kalemine dönüştürme döngüsü
3. Basit hatırlatma altyapısı

Film, seyahat detayı, takvim entegrasyonu, ortak masraf paylaşımı = sonraki fazlar. MVP dışına çıkma, kullanıcı istese bile önce kapsam genişlemesi olduğunu hatırlat.

**Durum (2026-07-07):** MVP + cila tamamlandı, Netlify'da yayında (lifeassistantai.netlify.app; ev ISS'i netlify.app'i engelliyor, GitHub Pages yapılandırması hazır bekliyor). Kullanıcı onayıyla Faz 2'ye geçildi — ilk modül: film listesi (izleme listesi + puanlama tamam; sıradaki dilim TMDB araması, sonra film günü hatırlatması). Kalan Faz 2: takvim/yaşam kategorileri, limit asistanı.

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
