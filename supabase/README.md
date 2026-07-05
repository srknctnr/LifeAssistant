# Supabase

Şema değişiklikleri bu klasördeki migration dosyaları olarak tutulur.

## Kurallar

- Her şema değişikliği `migrations/` altında zaman damgalı bir SQL dosyasıdır:
  `YYYYMMDDHHMMSS_short_description.sql`
- Migration'lar sıralı ve geri alınamaz kabul edilir; mevcut bir migration'ı
  düzenlemek yerine yeni bir migration ekle.
- Her tabloda RLS (Row Level Security) etkin olmalı ve politikalar migration
  içinde tanımlanmalı.

## Uygulama

Supabase CLI ile (önerilen):

```sh
supabase link --project-ref <project-ref>
supabase db push
```

CLI yoksa migration dosyası Supabase Dashboard -> SQL Editor üzerinden elle
çalıştırılabilir; hangi migration'ın uygulandığını commit mesajında not et.

## Tip üretimi

Şema değiştikçe TypeScript tiplerini yeniden üret:

```sh
supabase gen types typescript --linked > src/lib/database.types.ts
```
