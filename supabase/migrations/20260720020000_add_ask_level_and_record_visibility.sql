-- Family space rework: a third share level 'ask' (per-record opt-in) and an
-- is_family_visible flag on user-added records. Visibility rule per record:
--   level 'full'  -> every record of the module is family-visible
--   level 'ask'   -> only records flagged is_family_visible
--   level 'summary' -> no rows (budget totals via family_budget_summary)
-- Child records (goals, contributions, category entries) follow their parent.

alter table public.module_shares
  drop constraint module_shares_level_check;
alter table public.module_shares
  add constraint module_shares_level_check
  check (level in ('summary', 'full', 'ask'));

alter table public.incomes
  add column is_family_visible boolean not null default false;
alter table public.expense_items
  add column is_family_visible boolean not null default false;
alter table public.transactions
  add column is_family_visible boolean not null default false;
alter table public.wishlist_items
  add column is_family_visible boolean not null default false;
alter table public.movies
  add column is_family_visible boolean not null default false;
alter table public.life_categories
  add column is_family_visible boolean not null default false;

create or replace function public.record_shared_with_me(
  p_owner uuid,
  p_module text,
  p_visible boolean
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
      and (s.level = 'full' or (s.level = 'ask' and p_visible))
  );
$$;

-- budget
drop policy "incomes_select_family" on public.incomes;
create policy "incomes_select_family" on public.incomes
  for select to authenticated
  using (public.record_shared_with_me(user_id, 'budget', is_family_visible));

drop policy "expense_items_select_family" on public.expense_items;
create policy "expense_items_select_family" on public.expense_items
  for select to authenticated
  using (public.record_shared_with_me(user_id, 'budget', is_family_visible));

drop policy "transactions_select_family" on public.transactions;
create policy "transactions_select_family" on public.transactions
  for select to authenticated
  using (public.record_shared_with_me(user_id, 'budget', is_family_visible));

-- wishlist (children follow the wish)
drop policy "wishlist_items_select_family" on public.wishlist_items;
create policy "wishlist_items_select_family" on public.wishlist_items
  for select to authenticated
  using (
    public.record_shared_with_me(user_id, 'wishlist', is_family_visible)
  );

drop policy "savings_goals_select_family" on public.savings_goals;
create policy "savings_goals_select_family" on public.savings_goals
  for select to authenticated
  using (
    public.record_shared_with_me(
      user_id,
      'wishlist',
      exists (
        select 1 from public.wishlist_items w
        where w.id = wishlist_item_id and w.is_family_visible
      )
    )
  );

drop policy "savings_contributions_select_family" on public.savings_contributions;
create policy "savings_contributions_select_family" on public.savings_contributions
  for select to authenticated
  using (
    public.record_shared_with_me(
      user_id,
      'wishlist',
      exists (
        select 1
        from public.savings_goals g
        join public.wishlist_items w on w.id = g.wishlist_item_id
        where g.id = savings_goal_id and w.is_family_visible
      )
    )
  );

-- movies
drop policy "movies_select_family" on public.movies;
create policy "movies_select_family" on public.movies
  for select to authenticated
  using (public.record_shared_with_me(user_id, 'movies', is_family_visible));

-- calendar (entries follow the category)
drop policy "life_categories_select_family" on public.life_categories;
create policy "life_categories_select_family" on public.life_categories
  for select to authenticated
  using (
    public.record_shared_with_me(user_id, 'calendar', is_family_visible)
  );

drop policy "category_entries_select_family" on public.category_entries;
create policy "category_entries_select_family" on public.category_entries
  for select to authenticated
  using (
    public.record_shared_with_me(
      user_id,
      'calendar',
      exists (
        select 1 from public.life_categories c
        where c.id = category_id and c.is_family_visible
      )
    )
  );
