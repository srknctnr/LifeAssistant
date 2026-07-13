-- User-defined spending categories; the app merges these with a built-in
-- default list and offers them as a picker for expenses and transactions.

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.budget_categories is 'Custom category names added by the user on top of the built-in defaults';

create index budget_categories_user_id_idx on public.budget_categories (user_id);
create unique index budget_categories_user_name_unique
  on public.budget_categories (user_id, name);

alter table public.budget_categories enable row level security;

create policy "budget_categories_select_own" on public.budget_categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "budget_categories_insert_own" on public.budget_categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "budget_categories_update_own" on public.budget_categories
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "budget_categories_delete_own" on public.budget_categories
  for delete to authenticated using ((select auth.uid()) = user_id);
