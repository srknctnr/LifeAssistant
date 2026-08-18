-- Shared expenses ("Ortak Kasa"), Tricount-style, inside the existing group
-- primitive: `families` is already multi-group (family, housemates, holiday
-- crew), so a shared ledger hangs off family_id. Unlike module_shares, this
-- data is the group's by nature — every member reads and writes it.
--
-- Money: the header carries the total, expense_shares carry each person's
-- share, and a deferred constraint trigger enforces that the shares sum to
-- the total exactly (numeric, no epsilon). Balances are derived on the
-- client from expenses + settlements; nothing stores a running balance.

alter table public.families
  add column currency text not null default 'TRY'
    check (currency ~ '^[A-Z]{3}$');

create table public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  paid_by uuid not null references public.profiles (user_id) on delete restrict,
  spent_on date not null default current_date,
  category text,
  note text,
  split_mode text not null default 'equal'
    check (split_mode in ('equal', 'amount')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, family_id) -- target of the composite FK on expense_shares
);

comment on table public.shared_expenses is 'Group ledger: who paid what for the group; shares live in expense_shares';

create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null,
  family_id uuid not null,
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, user_id),
  -- family_id travels with the row so RLS never has to join the header
  foreign key (expense_id, family_id)
    references public.shared_expenses (id, family_id) on delete cascade
);

comment on table public.expense_shares is 'Per-person share of a shared expense; shares always sum to the header amount';

create table public.expense_settlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  from_user uuid not null references public.profiles (user_id) on delete restrict,
  to_user uuid not null references public.profiles (user_id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  settled_on date not null default current_date,
  note text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

comment on table public.expense_settlements is 'Cash moved between members to close a balance; never consumption';

create index shared_expenses_family_spent_on_idx
  on public.shared_expenses (family_id, spent_on desc);
create index expense_shares_family_user_idx
  on public.expense_shares (family_id, user_id);
create index expense_settlements_family_idx
  on public.expense_settlements (family_id, settled_on desc);

create trigger set_shared_expenses_updated_at
  before update on public.shared_expenses
  for each row execute function public.set_updated_at();

-- is_family_member() only knows auth.uid(); these answer about someone else
create or replace function public.is_group_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $fn$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family_id and m.user_id = p_user_id
  );
$fn$;

-- somebody who has left the group can still be owed money, so settlements
-- accept anyone who ever took part
create or replace function public.is_group_participant(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $fn$
  select public.is_group_member(p_family_id, p_user_id)
    or exists (
      select 1 from public.expense_shares s
      where s.family_id = p_family_id and s.user_id = p_user_id
    )
    or exists (
      select 1 from public.shared_expenses e
      where e.family_id = p_family_id and e.paid_by = p_user_id
    );
$fn$;

-- The invariant, checked at COMMIT so a save can write the header first and
-- the shares after it
create or replace function public.check_expense_shares_sum()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_amount numeric(12,2);
  v_sum numeric(12,2);
begin
  if tg_table_name = 'shared_expenses' then
    v_id := new.id;
  else
    v_id := coalesce(new.expense_id, old.expense_id);
  end if;

  select e.amount into v_amount
    from public.shared_expenses e where e.id = v_id;
  if v_amount is null then
    return null; -- the header went away in the same transaction
  end if;

  select coalesce(sum(s.amount), 0) into v_sum
    from public.expense_shares s where s.expense_id = v_id;

  if v_sum <> v_amount then
    raise exception 'Payların toplamı harcama tutarına eşit olmalı';
  end if;
  return null;
end;
$fn$;

create constraint trigger shared_expenses_shares_sum
  after insert or update on public.shared_expenses
  deferrable initially deferred
  for each row execute function public.check_expense_shares_sum();

create constraint trigger expense_shares_sum
  after insert or update or delete on public.expense_shares
  deferrable initially deferred
  for each row execute function public.check_expense_shares_sum();

-- WITH CHECK cannot see OLD, so the group and the author are pinned here
create or replace function public.pin_shared_expense_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.family_id := old.family_id;
  new.created_by := old.created_by;
  return new;
end;
$fn$;

create trigger pin_shared_expenses_owner
  before update on public.shared_expenses
  for each row execute function public.pin_shared_expense_owner();

alter table public.shared_expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.expense_settlements enable row level security;

-- Every member of the group may read and write the ledger: a shared expense
-- belongs to the group, not to whoever typed it in.
create policy "shared_expenses_select_member" on public.shared_expenses
  for select to authenticated using (public.is_family_member(family_id));
create policy "shared_expenses_insert_member" on public.shared_expenses
  for insert to authenticated with check (
    public.is_family_member(family_id)
    and created_by = (select auth.uid())
    and public.is_group_member(family_id, paid_by)
  );
create policy "shared_expenses_update_member" on public.shared_expenses
  for update to authenticated using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and public.is_group_member(family_id, paid_by)
  );
create policy "shared_expenses_delete_member" on public.shared_expenses
  for delete to authenticated using (public.is_family_member(family_id));

create policy "expense_shares_select_member" on public.expense_shares
  for select to authenticated using (public.is_family_member(family_id));
create policy "expense_shares_insert_member" on public.expense_shares
  for insert to authenticated with check (
    public.is_family_member(family_id)
    and public.is_group_member(family_id, user_id)
  );
create policy "expense_shares_update_member" on public.expense_shares
  for update to authenticated using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and public.is_group_member(family_id, user_id)
  );
create policy "expense_shares_delete_member" on public.expense_shares
  for delete to authenticated using (public.is_family_member(family_id));

create policy "expense_settlements_select_member" on public.expense_settlements
  for select to authenticated using (public.is_family_member(family_id));
create policy "expense_settlements_insert_member" on public.expense_settlements
  for insert to authenticated with check (
    public.is_family_member(family_id)
    and created_by = (select auth.uid())
    and public.is_group_participant(family_id, from_user)
    and public.is_group_participant(family_id, to_user)
  );
-- no update policy: a wrong settlement is deleted and entered again
create policy "expense_settlements_delete_party" on public.expense_settlements
  for delete to authenticated using (
    public.is_family_member(family_id)
    and (
      created_by = (select auth.uid())
      or from_user = (select auth.uid())
      or to_user = (select auth.uid())
      or public.is_family_owner(family_id)
    )
  );

-- Header and shares in one transaction, or nothing. security invoker, so
-- every policy above still applies to the caller.
create or replace function public.save_shared_expense(
  p_family_id uuid,
  p_title text,
  p_amount numeric,
  p_paid_by uuid,
  p_spent_on date,
  p_shares jsonb, -- [{"user_id": "...", "amount": 12.34}, ...]
  p_split_mode text default 'equal',
  p_category text default null,
  p_note text default null,
  p_expense_id uuid default null -- null inserts, otherwise replaces
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_currency text;
  v_sum numeric(12,2);
begin
  select f.currency into v_currency
    from public.families f where f.id = p_family_id;
  if v_currency is null then
    raise exception 'Grup bulunamadı';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'Bu grubun üyesi değilsin';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Tutar sıfırdan büyük olmalı';
  end if;
  if not public.is_group_member(p_family_id, p_paid_by) then
    raise exception 'Ödeyen kişi grubun üyesi değil';
  end if;
  if p_shares is null or jsonb_array_length(p_shares) = 0 then
    raise exception 'En az bir kişi harcamayı paylaşmalı';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_shares) s
    where not public.is_group_member(p_family_id, (s->>'user_id')::uuid)
  ) then
    raise exception 'Paylaşanlardan biri grubun üyesi değil';
  end if;

  select coalesce(sum(round((s->>'amount')::numeric, 2)), 0) into v_sum
    from jsonb_array_elements(p_shares) s;
  if v_sum <> round(p_amount, 2) then
    raise exception 'Payların toplamı tutara eşit olmalı';
  end if;

  if p_expense_id is null then
    insert into public.shared_expenses (
      family_id, title, amount, currency, paid_by, spent_on,
      category, note, split_mode, created_by
    ) values (
      p_family_id, p_title, round(p_amount, 2), v_currency, p_paid_by,
      coalesce(p_spent_on, current_date), p_category, p_note,
      p_split_mode, (select auth.uid())
    ) returning id into v_id;
  else
    update public.shared_expenses set
      title = p_title,
      amount = round(p_amount, 2),
      paid_by = p_paid_by,
      spent_on = coalesce(p_spent_on, current_date),
      category = p_category,
      note = p_note,
      split_mode = p_split_mode
    where id = p_expense_id and family_id = p_family_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Harcama bulunamadı';
    end if;
    delete from public.expense_shares where expense_id = v_id;
  end if;

  insert into public.expense_shares (expense_id, family_id, user_id, amount)
  select v_id, p_family_id, (s->>'user_id')::uuid,
         round((s->>'amount')::numeric, 2)
    from jsonb_array_elements(p_shares) s;

  return v_id; -- the deferred triggers verify the sum at COMMIT
end;
$fn$;
