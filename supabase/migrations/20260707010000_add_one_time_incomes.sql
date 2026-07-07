-- One-time (extra) incomes: bonus, sale proceeds etc. Recurring incomes keep
-- salary_day; one-time incomes carry income_date instead and count only
-- toward that month.

alter table public.incomes
  alter column salary_day drop not null;

alter table public.incomes
  add column income_date date;

comment on column public.incomes.income_date is 'For one-time incomes: the day the income arrives; determines which month it counts toward';

-- exactly one scheduling mode per row
alter table public.incomes
  add constraint incomes_schedule_check check (
    (income_date is null and salary_day is not null)
    or (income_date is not null and salary_day is null)
  );
