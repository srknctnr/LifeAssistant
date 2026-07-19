-- Family foundations (slice 1 of 3): profiles with display names, families,
-- memberships and code-based invites. Module sharing (slice 2) and the
-- shared spending space (slice 3) build on these tables.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Display names shown to family members; auth.users is never exposed to clients';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_families_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id),
  -- membership requires a profile so members can see each other's names
  constraint family_members_profile_fkey
    foreign key (user_id) references public.profiles (user_id) on delete cascade
);

create index family_members_user_id_idx on public.family_members (user_id);
create index family_members_family_id_idx on public.family_members (family_id);

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  invited_email text not null,
  code text not null unique,
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create index family_invites_family_id_idx on public.family_invites (family_id);

-- Security-definer helpers keep family_members policies non-recursive
create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;

-- display names are meant to be seen by other members; keep them readable
-- to any signed-in user, writable only by their owner
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "families_select_member" on public.families
  for select to authenticated
  using (public.is_family_member(id) or created_by = (select auth.uid()));
create policy "families_insert_own" on public.families
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "families_update_owner" on public.families
  for update to authenticated using (public.is_family_owner(id))
  with check (public.is_family_owner(id));
create policy "families_delete_owner" on public.families
  for delete to authenticated using (public.is_family_owner(id));

create policy "family_members_select_member" on public.family_members
  for select to authenticated using (public.is_family_member(family_id));
-- only the family creator self-adds here (as owner); everyone else joins
-- through the accept_family_invite function below
create policy "family_members_insert_creator" on public.family_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.families f
      where f.id = family_id and f.created_by = (select auth.uid())
    )
  );
create policy "family_members_delete_self_or_owner" on public.family_members
  for delete to authenticated using (
    user_id = (select auth.uid()) or public.is_family_owner(family_id)
  );

create policy "family_invites_select_owner" on public.family_invites
  for select to authenticated using (public.is_family_owner(family_id));
create policy "family_invites_insert_owner" on public.family_invites
  for insert to authenticated with check (
    invited_by = (select auth.uid()) and public.is_family_owner(family_id)
  );
create policy "family_invites_update_owner" on public.family_invites
  for update to authenticated using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));

-- What each member opens to a family, and at which detail level. Slice 2
-- wires these into the data tables' RLS; the picker UI ships already.
create table public.module_shares (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  module text not null
    check (module in ('budget', 'wishlist', 'movies', 'calendar')),
  level text not null default 'full' check (level in ('summary', 'full')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id, module)
);

create index module_shares_family_id_idx on public.module_shares (family_id);

create trigger set_module_shares_updated_at
  before update on public.module_shares
  for each row execute function public.set_updated_at();

alter table public.module_shares enable row level security;

create policy "module_shares_select_member" on public.module_shares
  for select to authenticated using (public.is_family_member(family_id));
create policy "module_shares_insert_own" on public.module_shares
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_family_member(family_id)
  );
create policy "module_shares_update_own" on public.module_shares
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "module_shares_delete_own" on public.module_shares
  for delete to authenticated using (user_id = (select auth.uid()));

-- Joining: validates the code against the caller's e-mail, adds the
-- membership, marks the invite accepted and drops a reminder for the owner
create or replace function public.accept_family_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.family_invites%rowtype;
  v_email text;
  v_name text;
begin
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into v_invite
  from public.family_invites
  where code = upper(trim(p_code)) and status = 'pending'
  for update;

  if not found then
    raise exception 'Davet kodu bulunamadı ya da kullanılmış';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Davet kodunun süresi dolmuş';
  end if;
  if lower(v_invite.invited_email) <> v_email then
    raise exception 'Bu davet başka bir e-posta adresine gönderilmiş';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_invite.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  update public.family_invites
  set status = 'accepted'
  where id = v_invite.id;

  select display_name into v_name
  from public.profiles
  where user_id = auth.uid();

  insert into public.reminders (user_id, title, due_on, source_type)
  values (
    v_invite.invited_by,
    coalesce(v_name, 'Yeni üye') || ' ailene katıldı 🎉',
    current_date,
    'manual'
  );

  return v_invite.family_id;
end;
$$;
