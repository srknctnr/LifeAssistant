-- Trip notebook (Faz 3, slice 2): the "düzenli not defteri" the vision doc
-- asks for — where you sleep, how you get there, what you booked, what you
-- must not forget. Deliberately NOT events: most of these have no time, and
-- several are structured fields rather than a calendar row.
--
-- Visibility is inherited from the trip, never declared again: a personal
-- trip's notebook is personal, a group trip's notebook is the group's. That
-- keeps a single source of truth for "who may see this trip".

create type public.trip_item_kind as enum (
  'stay',
  'transport',
  'activity',
  'note'
);

create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.trip_item_kind not null default 'note',
  title text not null,
  starts_on date,
  starts_at time,
  location text,
  link text,
  confirmation_no text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a time without a day would sort nowhere
  constraint trip_items_time_needs_a_day
    check (starts_at is null or starts_on is not null)
);

comment on table public.trip_items is 'Trip notebook rows (stay, transport, activity, note); visibility follows the trip';
comment on column public.trip_items.user_id is 'who added the row — shown as a chip on a group trip, never a permission';

create index trip_items_trip_id_starts_on_idx
  on public.trip_items (trip_id, starts_on);

create trigger set_trip_items_updated_at
  before update on public.trip_items
  for each row execute function public.set_updated_at();

-- One place decides who may touch a trip's notebook: the trip itself.
create or replace function public.can_use_trip(p_trip_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $fn$
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and (
        t.user_id = (select auth.uid())
        or (t.family_id is not null and public.is_family_member(t.family_id))
      )
  );
$fn$;

revoke execute on function public.can_use_trip(uuid) from public, anon;
grant execute on function public.can_use_trip(uuid) to authenticated, service_role;

-- A row belongs to the trip and the person it was written for; only its
-- content is editable. Without this an UPDATE could re-point trip_id (USING
-- sees the old trip, WITH CHECK the new one, and both pass for anyone who can
-- use both) and move somebody else's booking into a private trip — the same
-- hole that expense_shares had before 20260818020000.
create or replace function public.pin_trip_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.trip_id := old.trip_id;
  new.user_id := old.user_id;
  return new;
end;
$fn$;

create trigger pin_trip_items
  before update on public.trip_items
  for each row execute function public.pin_trip_item();

alter table public.trip_items enable row level security;

create policy "trip_items_select_trip" on public.trip_items
  for select to authenticated using (public.can_use_trip(trip_id));
create policy "trip_items_insert_trip" on public.trip_items
  for insert to authenticated with check (
    public.can_use_trip(trip_id) and user_id = (select auth.uid())
  );
-- Co-editing, like the trip itself: anyone who can see the trip can fix a
-- typo in its plan.
create policy "trip_items_update_trip" on public.trip_items
  for update to authenticated using (public.can_use_trip(trip_id))
  with check (public.can_use_trip(trip_id));
create policy "trip_items_delete_trip" on public.trip_items
  for delete to authenticated using (public.can_use_trip(trip_id));
