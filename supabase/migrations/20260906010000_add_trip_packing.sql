-- Bavul listesi (Faz 3, dilim 6): the packing list, deferred four times.
--
-- The shape follows entirely from one question: on a GROUP trip, whose
-- checkmark is it? "Pasaport" is per person — four bodies, four passports. But
-- "çadır" is one object the group brings once. A design that answers only one
-- of those is either useless for a family (one person ticks the passport and
-- everyone else's disappears) or noisy (four identical tent rows).
--
-- So the tick is not a column on the item. It is the PRESENCE of a row in a
-- second table keyed (item, person): one list row, N ticks. What separates the
-- two cases is a flag on the ITEM, not a duplicate of it.
--
-- No new SECURITY DEFINER function: visibility is still decided in exactly one
-- place, can_use_trip(trip_id) from 20260820020000, which is already revoked
-- from public and anon. No new enum value either — adding one and using it in
-- the same transaction is impossible, and the SQL Editor runs this file as one
-- transaction (see 20260819030000).

create table public.trip_packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  -- normalized in the row rather than as an expression index, so a copied list
  -- can be inserted idempotently: PostgREST's on_conflict names columns
  title_key text generated always as (lower(btrim(title))) stored,
  category text,
  -- false (the default) = every body packs their own: the tick is personal.
  -- true = one object for the whole group: one tick answers for everyone.
  is_group_item boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, title_key),
  unique (id, trip_id) -- target of the composite FK on trip_packing_checks
);

comment on table public.trip_packing_items is
  'A trip''s packing list; the tick lives in trip_packing_checks, one row per person';
comment on column public.trip_packing_items.user_id is
  'who added the row — a chip on a group trip, never a permission';
comment on column public.trip_packing_items.is_group_item is
  'true = one object for the whole group (çadır): a single tick closes it for everyone';

create index trip_packing_items_trip_id_idx
  on public.trip_packing_items (trip_id);

create trigger set_trip_packing_items_updated_at
  before update on public.trip_packing_items
  for each row execute function public.set_updated_at();

-- Same reason as trip_items: without pinning, one PATCH could re-point trip_id
-- (USING sees the old trip, WITH CHECK the new one, and both pass for anyone
-- who can use both) and move an item into a trip others cannot see.
create or replace function public.pin_trip_packing_item()
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

create trigger pin_trip_packing_items
  before update on public.trip_packing_items
  for each row execute function public.pin_trip_packing_item();

create table public.trip_packing_checks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  -- trip_id travels with the row so RLS never has to join the item,
  -- the same trick expense_shares uses for family_id
  trip_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_at timestamptz not null default now(),
  unique (item_id, user_id), -- the same body cannot tick twice
  foreign key (item_id, trip_id)
    references public.trip_packing_items (id, trip_id) on delete cascade
);

comment on table public.trip_packing_checks is
  'One row = one person has packed one item. Presence is the state; unticking deletes the row.';

create index trip_packing_checks_trip_user_idx
  on public.trip_packing_checks (trip_id, user_id);

alter table public.trip_packing_items enable row level security;
alter table public.trip_packing_checks enable row level security;

-- The list is the trip's, and co-edited like the notebook: anyone who can see
-- the trip can add an item, fix a typo, or delete a line.
create policy "trip_packing_items_select_trip" on public.trip_packing_items
  for select to authenticated using (public.can_use_trip(trip_id));
create policy "trip_packing_items_insert_trip" on public.trip_packing_items
  for insert to authenticated with check (
    public.can_use_trip(trip_id) and user_id = (select auth.uid())
  );
create policy "trip_packing_items_update_trip" on public.trip_packing_items
  for update to authenticated using (public.can_use_trip(trip_id))
  with check (public.can_use_trip(trip_id));
create policy "trip_packing_items_delete_trip" on public.trip_packing_items
  for delete to authenticated using (public.can_use_trip(trip_id));

-- A tick is NOT co-edited, and that is the one place this table's contract
-- differs from the notebook's. A tick is one person asserting a fact about
-- their own hands — "I put this in the bag". Nobody may assert it on your
-- behalf, so a forged tick (telling you your passport is packed when it is
-- not) is impossible at the database, not merely discouraged in the UI. By the
-- same token only the person who made the assertion may retract it: a group
-- item ticked by mistake is untickable by the one who ticked it, whose name the
-- row carries. There is deliberately NO update policy — a tick is inserted or
-- deleted, never edited, which leaves nothing for a pin trigger to freeze.
create policy "trip_packing_checks_select_trip" on public.trip_packing_checks
  for select to authenticated using (public.can_use_trip(trip_id));
create policy "trip_packing_checks_insert_own" on public.trip_packing_checks
  for insert to authenticated with check (
    public.can_use_trip(trip_id) and user_id = (select auth.uid())
  );
create policy "trip_packing_checks_delete_own" on public.trip_packing_checks
  for delete to authenticated using (
    public.can_use_trip(trip_id) and user_id = (select auth.uid())
  );

notify pgrst, 'reload schema';
