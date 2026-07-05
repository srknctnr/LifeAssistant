-- Initial schema for Life Assistant MVP
-- Core loop: wishlist item -> savings goal -> budget expense item
-- Decisions (2026-07-06): numeric(12,2) + ISO currency column (TRY default),
-- contributions ledger for savings tracking, in-app reminders only.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.expense_period as enum ('weekly', 'monthly', 'yearly');
create type public.expense_source as enum ('manual', 'savings_goal');
create type public.wishlist_kind as enum ('purchase', 'travel');
create type public.wishlist_status as enum ('active', 'converted', 'completed', 'archived');
create type public.savings_goal_status as enum ('active', 'paused', 'completed', 'cancelled');
create type public.reminder_source as enum ('manual', 'savings_goal', 'wishlist_item');
create type public.reminder_status as enum ('pending', 'done', 'dismissed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  salary_day smallint not null check (salary_day between 1 and 31),
  auto_renew boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.incomes is 'Recurring income definitions; renewed on salary_day each month when auto_renew is set';

create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  period public.expense_period not null default 'monthly',
  category text,
  source public.expense_source not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expense_items is 'Planned recurring expenses; source=savings_goal rows are managed by the core loop';

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind public.wishlist_kind not null,
  estimated_amount numeric(12, 2) not null check (estimated_amount >= 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  target_date date,
  status public.wishlist_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wishlist_items is 'Purchase and travel wishes; converting one creates a savings goal (target_date required at conversion, enforced in app)';

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wishlist_item_id uuid not null unique references public.wishlist_items (id) on delete cascade,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  monthly_amount numeric(12, 2) not null check (monthly_amount > 0),
  start_date date not null default current_date,
  expense_item_id uuid references public.expense_items (id) on delete set null,
  status public.savings_goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.savings_goals is 'Core loop: frozen target copied from the wishlist item at conversion; expense_item_id links the generated budget line';

create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  savings_goal_id uuid not null references public.savings_goals (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  contributed_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.savings_contributions is 'Ledger of actual contributions; accumulated total is the sum per goal';

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  due_on date not null,
  source_type public.reminder_source not null default 'manual',
  source_id uuid,
  status public.reminder_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reminders is 'In-app reminders; source_type/source_id point back to the originating record';

-- ---------------------------------------------------------------------------
-- Indexes (FK columns are not indexed automatically)
-- ---------------------------------------------------------------------------

create index incomes_user_id_idx on public.incomes (user_id);
create index expense_items_user_id_idx on public.expense_items (user_id);
create index wishlist_items_user_id_idx on public.wishlist_items (user_id);
create index savings_goals_user_id_idx on public.savings_goals (user_id);
create index savings_goals_expense_item_id_idx on public.savings_goals (expense_item_id);
create index savings_contributions_user_id_idx on public.savings_contributions (user_id);
create index savings_contributions_goal_id_idx on public.savings_contributions (savings_goal_id);
create index reminders_user_id_status_due_on_idx on public.reminders (user_id, status, due_on);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger set_incomes_updated_at
  before update on public.incomes
  for each row execute function public.set_updated_at();

create trigger set_expense_items_updated_at
  before update on public.expense_items
  for each row execute function public.set_updated_at();

create trigger set_wishlist_items_updated_at
  before update on public.wishlist_items
  for each row execute function public.set_updated_at();

create trigger set_savings_goals_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

create trigger set_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every row is owned by user_id = auth.uid()
-- ---------------------------------------------------------------------------

alter table public.incomes enable row level security;
alter table public.expense_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.reminders enable row level security;

-- incomes
create policy "incomes_select_own" on public.incomes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "incomes_insert_own" on public.incomes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "incomes_update_own" on public.incomes
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "incomes_delete_own" on public.incomes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- expense_items
create policy "expense_items_select_own" on public.expense_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "expense_items_insert_own" on public.expense_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "expense_items_update_own" on public.expense_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "expense_items_delete_own" on public.expense_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- wishlist_items
create policy "wishlist_items_select_own" on public.wishlist_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "wishlist_items_insert_own" on public.wishlist_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wishlist_items_update_own" on public.wishlist_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "wishlist_items_delete_own" on public.wishlist_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- savings_goals
create policy "savings_goals_select_own" on public.savings_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "savings_goals_insert_own" on public.savings_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "savings_goals_update_own" on public.savings_goals
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "savings_goals_delete_own" on public.savings_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

-- savings_contributions
create policy "savings_contributions_select_own" on public.savings_contributions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "savings_contributions_insert_own" on public.savings_contributions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "savings_contributions_update_own" on public.savings_contributions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "savings_contributions_delete_own" on public.savings_contributions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- reminders
create policy "reminders_select_own" on public.reminders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "reminders_insert_own" on public.reminders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reminders_update_own" on public.reminders
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "reminders_delete_own" on public.reminders
  for delete to authenticated using ((select auth.uid()) = user_id);
