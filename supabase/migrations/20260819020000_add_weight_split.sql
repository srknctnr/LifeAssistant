-- Weighted splitting: "2 yetişkin + 1 çocuk" is 2/2/1, not three equal parts.
-- The share amounts are still what the ledger reads — the weights are stored
-- only so reopening the expense shows the same weights instead of bare
-- amounts, and so a changed total re-splits the same way.

alter table public.shared_expenses
  drop constraint shared_expenses_split_mode_check;
alter table public.shared_expenses
  add constraint shared_expenses_split_mode_check
  check (split_mode in ('equal', 'weight', 'amount'));

alter table public.expense_shares
  add column weight numeric(6,2) check (weight is null or weight > 0);

comment on column public.expense_shares.weight is 'Only set for split_mode weight; the amount column stays authoritative';

-- Same body as 20260818020000, with the weight carried through from p_shares.
create or replace function public.save_shared_expense(
  p_family_id uuid,
  p_title text,
  p_amount numeric,
  p_paid_by uuid,
  p_spent_on date,
  p_shares jsonb, -- [{"user_id": "...", "amount": 12.34, "weight": 2}, ...]
  p_split_mode text default 'equal',
  p_category text default null,
  p_note text default null,
  p_expense_id uuid default null
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

revoke execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
) from public, anon;
grant execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
) to authenticated, service_role;
