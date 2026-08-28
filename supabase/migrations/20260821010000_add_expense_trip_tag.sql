-- "Bu gezide ne harcadık": a shared expense can carry the trip it belongs to.
--
-- This is a LABEL, not a second set of books. The balance stays defined over
-- the whole group — computeBalances/settleUp keep reading every expense and
-- every settlement — because a settlement is a cash transfer between people
-- and cannot belong to a trip. Tagging only filters the list and totals what
-- was spent; if it fed the balance there would be two different answers to
-- "who owes whom", which is the double-counting trap in a new costume.

alter table public.shared_expenses
  add column trip_id uuid references public.trips (id) on delete set null;

comment on column public.shared_expenses.trip_id is
  'Optional tag: which trip this expense was for. Filters and totals only — the group balance ignores it.';

create index shared_expenses_trip_id_idx
  on public.shared_expenses (trip_id)
  where trip_id is not null;

-- A tag may only point at a trip that belongs to the same group, otherwise an
-- expense could name a trip its group cannot see.
create or replace function public.trip_in_family(p_trip_id uuid, p_family_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $fn$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.family_id = p_family_id
  );
$fn$;

revoke execute on function public.trip_in_family(uuid, uuid) from public, anon;
grant execute on function public.trip_in_family(uuid, uuid) to authenticated, service_role;

drop policy "shared_expenses_insert_member" on public.shared_expenses;
create policy "shared_expenses_insert_member" on public.shared_expenses
  for insert to authenticated with check (
    public.is_family_member(family_id)
    and created_by = (select auth.uid())
    and public.is_group_participant(family_id, paid_by)
    and (trip_id is null or public.trip_in_family(trip_id, family_id))
  );

drop policy "shared_expenses_update_member" on public.shared_expenses;
create policy "shared_expenses_update_member" on public.shared_expenses
  for update to authenticated using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and public.is_group_participant(family_id, paid_by)
    and (trip_id is null or public.trip_in_family(trip_id, family_id))
  );

-- Same body as 20260819020000 plus p_trip_id; the parameter defaults to null
-- so nothing that already calls this RPC has to change.
create or replace function public.save_shared_expense(
  p_family_id uuid,
  p_title text,
  p_amount numeric,
  p_paid_by uuid,
  p_spent_on date,
  p_shares jsonb,
  p_split_mode text default 'equal',
  p_category text default null,
  p_note text default null,
  p_expense_id uuid default null,
  p_trip_id uuid default null
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
  if not public.is_group_participant(p_family_id, p_paid_by) then
    raise exception 'Ödeyen kişi grubun üyesi değil';
  end if;
  if p_shares is null or jsonb_array_length(p_shares) = 0 then
    raise exception 'En az bir kişi harcamayı paylaşmalı';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_shares) s
    where not public.is_group_participant(p_family_id, (s->>'user_id')::uuid)
  ) then
    raise exception 'Paylaşanlardan biri grubun üyesi değil';
  end if;
  if p_trip_id is not null
     and not public.trip_in_family(p_trip_id, p_family_id) then
    raise exception 'Seçilen gezi bu gruba ait değil';
  end if;

  select coalesce(sum(round((s->>'amount')::numeric, 2)), 0) into v_sum
    from jsonb_array_elements(p_shares) s;
  if v_sum <> round(p_amount, 2) then
    raise exception 'Payların toplamı tutara eşit olmalı';
  end if;

  if p_expense_id is null then
    insert into public.shared_expenses (
      family_id, title, amount, currency, paid_by, spent_on,
      category, note, split_mode, trip_id, created_by
    ) values (
      p_family_id, p_title, round(p_amount, 2), v_currency, p_paid_by,
      coalesce(p_spent_on, current_date), p_category, p_note,
      p_split_mode, p_trip_id, (select auth.uid())
    ) returning id into v_id;
  else
    update public.shared_expenses set
      title = p_title,
      amount = round(p_amount, 2),
      paid_by = p_paid_by,
      spent_on = coalesce(p_spent_on, current_date),
      category = p_category,
      note = p_note,
      split_mode = p_split_mode,
      trip_id = p_trip_id
    where id = p_expense_id and family_id = p_family_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Harcama bulunamadı';
    end if;

    -- only drop the people who are no longer on the expense, so a departed
    -- participant never loses the row that keeps them eligible
    delete from public.expense_shares
    where expense_id = v_id
      and user_id not in (
        select (s->>'user_id')::uuid from jsonb_array_elements(p_shares) s
      );
  end if;

  insert into public.expense_shares (expense_id, family_id, user_id, amount, weight)
  select v_id, p_family_id, (s->>'user_id')::uuid,
         round((s->>'amount')::numeric, 2),
         nullif(s->>'weight', '')::numeric
    from jsonb_array_elements(p_shares) s
  on conflict (expense_id, user_id) do update
    set amount = excluded.amount,
        weight = excluded.weight;

  return v_id; -- the deferred triggers verify the sums at COMMIT
end;
$fn$;

-- The old 10-argument signature would otherwise linger and make the call
-- ambiguous for PostgREST.
drop function if exists public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
);

revoke execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid, uuid
) from public, anon;
grant execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid, uuid
) to authenticated, service_role;
