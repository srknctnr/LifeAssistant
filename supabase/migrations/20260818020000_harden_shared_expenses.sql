-- Hardening pass over the Ortak Kasa schema, from an adversarial review of
-- 20260818010000. Four independent holes, all confirmed against the live
-- project before writing this file:
--
-- 1. expense_shares had no pin trigger, and the sum check only re-verified
--    the destination expense on UPDATE — so one PATCH moving a share to
--    another expense left the source silently short of its header amount.
-- 2. is_group_member / is_group_participant are security definer and answer
--    about an arbitrary user id, and default EXECUTE-to-PUBLIC made them
--    callable with the publishable anon key: a membership oracle.
-- 3. save_shared_expense deleted every share before re-inserting, so editing
--    an expense whose only departed participant was on that expense failed
--    its own participant check halfway through.
-- 4. is_group_participant never looked at expense_settlements, while the
--    client treats settlement parties as participants — a dead end where the
--    UI offers a person every write then rejects.

-- ---------------------------------------------------------------------------
-- 1. expense_shares cannot be re-pointed, and both sides of a move are checked
-- ---------------------------------------------------------------------------

create or replace function public.pin_expense_share()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  -- a share belongs to the expense and person it was created for; only the
  -- amount is editable
  new.expense_id := old.expense_id;
  new.family_id := old.family_id;
  new.user_id := old.user_id;
  return new;
end;
$fn$;

create trigger pin_expense_shares
  before update on public.expense_shares
  for each row execute function public.pin_expense_share();

create or replace function public.check_expense_shares_sum()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_ids uuid[] := '{}';
  v_id uuid;
  v_amount numeric(12,2);
  v_sum numeric(12,2);
begin
  -- On UPDATE both NEW and OLD are populated; verifying only one of them is
  -- how a moved share used to leave its source expense unbalanced. The
  -- branches are kept in PL/pgSQL because shared_expenses has no expense_id
  -- column and DELETE has no NEW record.
  if tg_table_name = 'shared_expenses' then
    v_ids := array[new.id];
  else
    if tg_op <> 'DELETE' then
      v_ids := v_ids || new.expense_id;
    end if;
    -- on a plain UPDATE both ids are the same; checking twice is harmless
    if tg_op <> 'INSERT' then
      v_ids := v_ids || old.expense_id;
    end if;
  end if;

  foreach v_id in array v_ids
  loop
    select e.amount into v_amount
      from public.shared_expenses e where e.id = v_id;
    if v_amount is null then
      continue; -- the header went away in the same transaction
    end if;

    select coalesce(sum(s.amount), 0) into v_sum
      from public.expense_shares s where s.expense_id = v_id;

    if v_sum <> v_amount then
      raise exception 'Payların toplamı harcama tutarına eşit olmalı';
    end if;
  end loop;
  return null;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 2. The helpers stop answering questions for anonymous callers
-- ---------------------------------------------------------------------------
-- RLS policy expressions run as the querying role, so `authenticated` must
-- keep EXECUTE; nothing needs these as `anon`.

revoke execute on function public.is_group_member(uuid, uuid) from public, anon;
revoke execute on function public.is_group_participant(uuid, uuid) from public, anon;
revoke execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
) from public, anon;

grant execute on function public.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_group_participant(uuid, uuid) to authenticated, service_role;
grant execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Settlement parties count as participants (client already assumed this)
-- ---------------------------------------------------------------------------

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
    )
    or exists (
      select 1 from public.expense_settlements t
      where t.family_id = p_family_id
        and (t.from_user = p_user_id or t.to_user = p_user_id)
    );
$fn$;

revoke execute on function public.is_group_participant(uuid, uuid) from public, anon;
grant execute on function public.is_group_participant(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Saving an expense keeps the rows it is going to write again
-- ---------------------------------------------------------------------------

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

    -- Only drop the people who are no longer on the expense. Deleting every
    -- share first could erase the very row that made a departed participant
    -- eligible, and the re-insert would then be refused by its own policy.
    delete from public.expense_shares
    where expense_id = v_id
      and user_id not in (
        select (s->>'user_id')::uuid from jsonb_array_elements(p_shares) s
      );
  end if;

  insert into public.expense_shares (expense_id, family_id, user_id, amount)
  select v_id, p_family_id, (s->>'user_id')::uuid,
         round((s->>'amount')::numeric, 2)
    from jsonb_array_elements(p_shares) s
  on conflict (expense_id, user_id) do update
    set amount = excluded.amount;

  return v_id; -- the deferred triggers verify the sums at COMMIT
end;
$fn$;

revoke execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
) from public, anon;
grant execute on function public.save_shared_expense(
  uuid, text, numeric, uuid, date, jsonb, text, text, text, uuid
) to authenticated, service_role;
