-- Movie-night reminders: movies with a planned_for date materialize
-- reminders just like savings contributions do.

alter type public.reminder_source add value if not exists 'movie';
