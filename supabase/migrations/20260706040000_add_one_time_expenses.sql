-- One-time expenses: a new 'once' period plus the date the expense counts
-- toward. Recurring items keep expense_date null.

alter type public.expense_period add value if not exists 'once';

alter table public.expense_items
  add column expense_date date;

comment on column public.expense_items.expense_date is 'For one-time (period=once) expenses: the day the expense occurs; determines which month it counts toward';
