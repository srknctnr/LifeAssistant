-- Faz 3 — Seyahat modülü, dilim 1.
--
-- Gezi = PLAN OMURGASI: kimlik + tarih aralığı + (opsiyonel) grup.
-- Kasten TUTMADIKLARI, her biri bir çift-sayım kapısı olduğu için:
--   * tutar/bütçe  -> bağlı isteğin estimated_amount'ı, dönüşümde
--                     savings_goals.target_amount'a dondurulur
--   * harcama/bakiye -> grubun shared_expenses defteri (istemcide türetilir)
--   * faz (yaklaşan/devam eden/geçmiş) -> tarihlerden türetilir, saklanmaz
--   * is_family_visible -> paylaşım ikilidir: family_id null mı, dolu mu
--
-- Yeni enum değeri yok (tek transaction'da add value + kullanım mümkün değil),
-- yeni RPC yok, yeni security definer fonksiyon yok — dolayısıyla
-- 20260818020000'de kapatılan "varsayılan PUBLIC EXECUTE" sınıfı bir yüzey de
-- açılmıyor. Mevcut is_family_member / is_family_owner (20260719010000)
-- yeniden kullanılıyor.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  title text not null,
  destination text,
  cover_emoji text,
  starts_on date not null,
  ends_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_ordered check (ends_on >= starts_on)
);

comment on table public.trips is
  'Trip spine: identity + date range only. Money lives on the linked wish/goal, the ledger on the group, calendar rows on each member''s own events. Phase is derived from the dates, never stored.';
comment on column public.trips.family_id is
  'null = personal trip; set = the group owns it, every member sees and co-edits it';
comment on column public.trips.user_id is
  'creator; pinned by pin_trip_owner and the only one who may attach/detach the group';

create index trips_user_id_starts_on_idx on public.trips (user_id, starts_on);
create index trips_family_id_starts_on_idx on public.trips (family_id, starts_on)
  where family_id is not null;

create trigger set_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- Kurucu sabittir; gruba taşımayı/gruptan çıkarmayı yalnız kurucu yapabilir.
-- (pin_shared_expense_owner emsali; security invoker, yeni definer yüzey yok.)
create or replace function public.pin_trip_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.user_id := old.user_id;
  if new.family_id is distinct from old.family_id
     and (select auth.uid()) <> old.user_id then
    raise exception 'Geziyi yalnız kuran kişi gruba bağlayabilir ya da gruptan çıkarabilir';
  end if;
  return new;
end;
$fn$;

create trigger pin_trips_owner
  before update on public.trips
  for each row execute function public.pin_trip_owner();

alter table public.trips enable row level security;

-- Kişisel gezi yalnız sahibinin; gruba bağlı gezi grubun verisidir ve izin
-- ÜYELİKTİR (shared_expenses ile aynı disiplin). module_shares'e yeni modül
-- eklenmiyor: aynı satıra ikinci bir izin ekseni koymak "hangi taraf kazanır"
-- hatalarının fabrikasıdır.
create policy "trips_select_own_or_group" on public.trips
  for select to authenticated using (
    (select auth.uid()) = user_id
    or (family_id is not null and public.is_family_member(family_id))
  );

-- Üyesi olmadığın gruba gezi iliştirip o gruba görünür kılamazsın.
create policy "trips_insert_own" on public.trips
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (family_id is null or public.is_family_member(family_id))
  );

-- Ortak düzenleme (doküman §2.3 "birlikte düzenlenebilir"): grubun her üyesi
-- grup gezisini düzenleyebilir. with check hedef grubun üyeliğini şart koşar;
-- user_id ve family_id değişimini pin_trip_owner trigger'ı sınırlar.
create policy "trips_update_own_or_group" on public.trips
  for update to authenticated using (
    (select auth.uid()) = user_id
    or (family_id is not null and public.is_family_member(family_id))
  ) with check (
    family_id is null or public.is_family_member(family_id)
  );

-- Silme kasten dar: düzenlemek her üyeye açık, silmek kurucuya ve grup
-- yöneticisine (expense_settlements_delete_party'nin ruhu).
create policy "trips_delete_owner" on public.trips
  for delete to authenticated using (
    (select auth.uid()) = user_id
    or (family_id is not null and public.is_family_owner(family_id))
  );

-- (a) Tasarruf bağı: FK İSTEĞİN üstünde, gezinin üstünde değil.
-- savings_goals.wishlist_item_id NOT NULL + UNIQUE olduğu ve GoalWithWish'in
-- her tüketicisi adı wishlist join'inden çözdüğü için çekirdek kama böyle hiç
-- değişmeden kalıyor. Grup gezisinde her yolcunun kendi isteği/hedefi olur;
-- kişi başına en fazla bir tanesi.
alter table public.wishlist_items
  add column trip_id uuid references public.trips (id) on delete set null;

comment on column public.wishlist_items.trip_id is
  'Travel wishes only: the trip this saving is for. SET NULL on trip delete so nobody else''s deletion can destroy your budget commitment.';

create unique index wishlist_items_trip_user_unique
  on public.wishlist_items (trip_id, user_id)
  where trip_id is not null;

-- (c) Takvim bağı: kişi başına en fazla BİR gezi çıpası (tüm-gün etkinlik).
-- events_user_movie_unique kalıbının birebir aynısı: "Takvime ekle"ye iki kez
-- basmak ya da iki cihazdan basmak çift etkinlik + çift hatırlatma üretemez.
-- Yeni event_kind değeri yok: çıpa kind='general' + trip_id'dir, ikon ve
-- filtre trip_id'den okunur. Hatırlatma planEventReminders'tan bedava gelir.
alter table public.events
  add column trip_id uuid references public.trips (id) on delete set null;

comment on column public.events.trip_id is
  'The trip this all-day event anchors. Events stay strictly personal: each member materializes their own anchor, so reminder ownership is never ambiguous.';

create unique index events_user_trip_unique
  on public.events (user_id, trip_id)
  where trip_id is not null;

-- wishlist_items.trip_id ve events.trip_id için yeni policy GEREKMEZ: ikisi de
-- zaten sahip-özel korunan tabloların kolonları ve mevcut politikalar yeni
-- kolonları otomatik kapsar.
