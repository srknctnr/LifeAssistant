-- A trip tag must not outlive the trip's membership of the group.
--
-- shared_expenses.trip_id is already cleared when the trip is deleted
-- (ON DELETE SET NULL), but a trip can also *leave* the group: its creator can
-- switch it to another group or make it personal (trips.family_id changes).
-- The tag then points at a trip the group cannot see, and because the update
-- policy re-checks trip_in_family() on every write — not only when trip_id
-- changes — that expense can no longer be edited at all. Fixing a typo would
-- fail with "Seçilen gezi bu gruba ait değil", and if it was the group's only
-- trip the picker is gone too, so there is no way back.
--
-- So the move drops the tag, the same way the delete does. The expense itself,
-- its shares and the balance are untouched: the tag was only ever a label.

create or replace function public.clear_moved_trip_tags()
returns trigger
language plpgsql
-- definer: whoever moved the trip may not be a member of the group that is
-- holding the tag, and they must not need to be in order to release it
security definer
set search_path = ''
as $fn$
begin
  update public.shared_expenses
     set trip_id = null
   where trip_id = new.id
     and (new.family_id is null or family_id <> new.family_id);
  return new;
end;
$fn$;

revoke execute on function public.clear_moved_trip_tags() from public, anon;

create trigger clear_moved_trip_tags
  after update of family_id on public.trips
  for each row
  when (new.family_id is distinct from old.family_id)
  execute function public.clear_moved_trip_tags();
