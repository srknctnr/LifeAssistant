# Life Assistant

Kişisel yaşam asistanı PWA'sı. MVP odağı: **İstek Listesi → Tasarruf Hedefi →
Bütçe** döngüsü — bir hedef ve tarih girilir, uygulama aylık biriktirme tutarını
hesaplar ve onayla bütçeye gider kalemi olarak ekler.

Vizyon ve yol haritası için [docs/life-assistant-proje-dokumani.md](docs/life-assistant-proje-dokumani.md),
çalışma kuralları için [CLAUDE.md](CLAUDE.md).

## Teknoloji

- **React 19 + Vite 8 + TypeScript** — mobil öncelikli PWA (`vite-plugin-pwa`)
- **Tailwind CSS 4** + **Motion** (animasyon) + **lucide-react** (ikonlar)
- **Supabase** — PostgreSQL + Auth; sunucu durumu **TanStack Query** ile
- **Vitest + Testing Library** — test; **oxlint + Prettier** — kalite
- **Netlify** — dağıtım hedefi

## Kurulum

```sh
npm install
cp .env.example .env.local   # Supabase URL ve anon key değerlerini gir
npm run dev
```

## Komutlar

| Komut                         | Açıklama                                 |
| ----------------------------- | ---------------------------------------- |
| `npm run dev`                 | Geliştirme sunucusu                      |
| `npm run build`               | Tip kontrolü + üretim derlemesi          |
| `npm run preview`             | Üretim derlemesini yerelde önizle        |
| `npm test`                    | Testleri çalıştır                        |
| `npm run lint`                | oxlint                                   |
| `npm run format`              | Prettier ile formatla                    |
| `npm run generate-pwa-assets` | `public/logo.svg`den PWA ikonlarını üret |

Commit öncesi husky + lint-staged otomatik olarak lint ve format çalıştırır.

## Proje yapısı

```
src/
  app/         # Uygulama kabuğu: router, layout
  components/  # Paylaşılan UI bileşenleri
  features/    # Modül bazlı özellikler (budget, wishlist, dashboard, ...)
  lib/         # Supabase istemcisi, query client, yardımcılar
  styles/      # Global stiller ve tema token'ları
supabase/
  migrations/  # SQL migration dosyaları (bkz. supabase/README.md)
```

Yeni modüller (film, seyahat, takvim) `src/features/` altına kendi klasörü
olarak eklenir; sayfalar `src/app/router.tsx` üzerinden bağlanır.
