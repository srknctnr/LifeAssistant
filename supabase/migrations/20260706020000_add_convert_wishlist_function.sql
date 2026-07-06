-- Core loop conversion: wishlist item -> savings goal + budget expense item,
-- executed atomically so a partial failure can't leave orphaned records.
-- Runs as the caller (security invoker); RLS keeps it scoped to own rows.

create or replace function public.convert_wishlist_item(
  p_wishlist_item_id uuid,
  p_monthly_amount numeric,
  p_target_date date default null,
  p_start_date date default current_date
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.wishlist_items%rowtype;
  v_expense_id uuid;
  v_goal_id uuid;
begin
  if p_monthly_amount is null or p_monthly_amount <= 0 then
    raise exception 'monthly amount must be positive';
  end if;

  select * into v_item
  from public.wishlist_items
  where id = p_wishlist_item_id
  for update;

  if not found then
    raise exception 'wishlist item not found';
  end if;

  if v_item.status <> 'active' then
    raise exception 'wishlist item is not active';
  end if;

  if p_target_date is not null then
    update public.wishlist_items
    set target_date = p_target_date
    where id = v_item.id;
  end if;

  insert into public.expense_items
    (user_id, name, amount, currency, period, category, source)
  values
    (v_item.user_id, v_item.name, p_monthly_amount, v_item.currency,
     'monthly', 'Tasarruf', 'savings_goal')
  returning id into v_expense_id;

  insert into public.savings_goals
    (user_id, wishlist_item_id, target_amount, currency, monthly_amount,
     start_date, expense_item_id)
  values
    (v_item.user_id, v_item.id, v_item.estimated_amount, v_item.currency,
     p_monthly_amount, p_start_date, v_expense_id)
  returning id into v_goal_id;

  update public.wishlist_items
  set status = 'converted'
  where id = v_item.id;

  return v_goal_id;
end;
$$;
