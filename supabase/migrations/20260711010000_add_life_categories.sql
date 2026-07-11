-- Phase 2, calendar module v1: simple life categories (Google Goals-style)
-- with a per-day done log and an optional weekly target.

create table public.life_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text,
  weekly_target smallint check (weekly_target between 1 and 21),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.life_categories is 'User-defined life areas (sport, reading, socializing) tracked on the calendar';

create table public.category_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.life_categories (id) on delete cascade,
  done_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.category_entries is 'Done-marks per category per day; weekly progress is counted from these';

create index life_categories_user_id_idx on public.life_categories (user_id);
create index category_entries_user_id_idx on public.category_entries (user_id);
create index category_entries_category_id_idx on public.category_entries (category_id);

-- a day is either done or not; toggling maps to insert/delete
create unique index category_entries_once_per_day
  on public.category_entries (category_id, done_on);

create trigger set_life_categories_updated_at
  before update on public.life_categories
  for each row execute function public.set_updated_at();

alter table public.life_categories enable row level security;
alter table public.category_entries enable row level security;

create policy "life_categories_select_own" on public.life_categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "life_categories_insert_own" on public.life_categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "life_categories_update_own" on public.life_categories
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "life_categories_delete_own" on public.life_categories
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "category_entries_select_own" on public.category_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "category_entries_insert_own" on public.category_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "category_entries_update_own" on public.category_entries
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "category_entries_delete_own" on public.category_entries
  for delete to authenticated using ((select auth.uid()) = user_id);
