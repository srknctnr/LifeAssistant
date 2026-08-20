-- pin_trip_owner (20260819030000) guards a real rule — only the creator may
-- attach a trip to a group or detach it — but it also fires on a write nobody
-- makes by hand: the family_id FK is ON DELETE SET NULL, and Postgres performs
-- that as a genuine `update trips set family_id = null`, which runs BEFORE ROW
-- UPDATE triggers. Deleting a group therefore hit the raise for every attached
-- trip belonging to someone else and rolled the whole delete back, so a group
-- holding a member's trip could not be deleted at all.
--
-- The discriminator is the parent row: during the FK's cleanup the families
-- row is already gone, while a user re-pointing a trip always leaves it there.

create or replace function public.pin_trip_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.user_id := old.user_id;
  if new.family_id is distinct from old.family_id
     and (select auth.uid()) <> old.user_id
     -- let the FK's own SET NULL through: it only detaches a group that no
     -- longer exists, and it is not somebody re-pointing the trip
     and (
       new.family_id is not null
       or exists (select 1 from public.families f where f.id = old.family_id)
     )
  then
    raise exception 'Geziyi yalnız kuran kişi gruba bağlayabilir ya da gruptan çıkarabilir';
  end if;
  return new;
end;
$fn$;
