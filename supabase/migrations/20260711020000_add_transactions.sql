-- Phase 2, limit assistant: a daily spending log, separate from the planned
-- budget (expense_items). Pace/limit analytics read from here.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  category text,
  note text,
  spent_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.transactions is 'Actual day-to-day spending; the planned budget lives in expense_items';

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_user_spent_on_idx on public.transactions (user_id, spent_on);

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "transactions_update_own" on public.transactions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);
