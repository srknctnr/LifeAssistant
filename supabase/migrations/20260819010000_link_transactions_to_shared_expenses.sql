-- "Payımı bütçeme yaz": a shared expense can mirror the caller's own share
-- into their personal spending log. The link column is what makes it safe —
-- without it the app could not tell whether a share had already been written,
-- and the point of the feature is that it can never double count.
--
-- Only the share is ever mirrored, never the amount paid and never a
-- settlement: what a person consumed is their share, regardless of who put
-- the money down or when the debt was closed.

alter table public.transactions
  add column shared_expense_id uuid
    references public.shared_expenses (id) on delete set null;

comment on column public.transactions.shared_expense_id is 'Set when this row mirrors the owner share of a group expense; one row per person per expense';

-- One mirror per person per expense. Partial, so ordinary transactions (which
-- leave the column null) are unaffected.
create unique index transactions_shared_expense_once
  on public.transactions (user_id, shared_expense_id)
  where shared_expense_id is not null;
