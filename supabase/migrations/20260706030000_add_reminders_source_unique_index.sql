-- Auto-generated reminders (e.g. monthly savings contribution nudges) are
-- synced from the client; this index makes that sync idempotent so the same
-- source+month reminder can never be duplicated. Manual reminders keep
-- source_id null and are unaffected (nulls are distinct).

create unique index reminders_user_source_due_unique
  on public.reminders (user_id, source_type, source_id, due_on);
