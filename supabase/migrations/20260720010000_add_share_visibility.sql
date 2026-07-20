-- Family sharing slice 2: members can read what a co-member opened to the
-- family. Full-level shares extend SELECT policies on the data tables;
-- summary-level budget access goes through a definer function that returns
-- only three totals (no row access).

create or replace function public.shares_full_with_me(
  p_owner uuid,
  p_module text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.module_shares s
    join public.family_members me
      on me.family_id = s.family_id and me.user_id = auth.uid()
    where s.user_id = p_owner
      and s.module = p_module
      and s.level = 'full'
  );
$$;

-- budget (full)
create policy "incomes_select_family" on public.incomes
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'budget'));
create policy "expense_items_select_family" on public.expense_items
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'budget'));
create policy "transactions_select_family" on public.transactions
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'budget'));

-- wishlist (full)
create policy "wishlist_items_select_family" on public.wishlist_items
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'wishlist'));
create policy "savings_goals_select_family" on public.savings_goals
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'wishlist'));
create policy "savings_contributions_select_family" on public.savings_contributions
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'wishlist'));

-- movies (full)
create policy "movies_select_family" on public.movies
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'movies'));

-- calendar (full)
create policy "life_categories_select_family" on public.life_categories
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'calendar'));
create policy "category_entries_select_family" on public.category_entries
  for select to authenticated
  using (public.shares_full_with_me(user_id, 'calendar'));

-- Budget summary for summary-or-full shares: three totals, no rows.
-- The client derives remaining / daily allowance / pace from these.
create or replace function public.family_budget_summary(p_owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_month text := to_char(current_date, 'YYYY-MM');
  v_income numeric;
  v_planned numeric;
  v_spent numeric;
begin
  if not exists (
    select 1
    from public.module_shares s
    join public.family_members me
      on me.family_id = s.family_id and me.user_id = auth.uid()
    where s.user_id = p_owner and s.module = 'budget'
  ) then
    raise exception 'Bu bütçe seninle paylaşılmamış';
  end if;

  select coalesce(sum(
    case
      when income_date is null then amount
      when to_char(income_date, 'YYYY-MM') = v_month then amount
      else 0
    end
  ), 0)
  into v_income
  from public.incomes
  where user_id = p_owner;

  select coalesce(sum(
    case
      when not is_active then 0
      when period = 'once' then
        case
          when expense_date is not null
            and to_char(expense_date, 'YYYY-MM') = v_month then amount
          else 0
        end
      when period = 'weekly' then amount * 52 / 12
      when period = 'monthly' then amount
      when period = 'yearly' then amount / 12
    end
  ), 0)
  into v_planned
  from public.expense_items
  where user_id = p_owner;

  select coalesce(sum(amount), 0)
  into v_spent
  from public.transactions
  where user_id = p_owner and to_char(spent_on, 'YYYY-MM') = v_month;

  return jsonb_build_object(
    'income', v_income,
    'planned', v_planned,
    'spent', v_spent
  );
end;
$$;
