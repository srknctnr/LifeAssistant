-- Takvim v2, calendar module: dated (optionally timed) events living next to
-- the life categories, not replacing them. kind 'movie' links an event to a
-- watchlist movie and mirrors movies.planned_for; a movie-kind event with no
-- movie yet is the "film gecesi var, film seçilmedi" state that drives the
-- suggestion band on the movies tab. Events feed the existing reminder sync.

-- The new reminder source goes first. Postgres has allowed
-- `alter type ... add value` inside a transaction block since v12; the only
-- restriction is that the new value cannot be USED in the same transaction,
-- and nothing below references 'event'.
alter type public.reminder_source add value if not exists 'event';

create type public.event_kind as enum ('general', 'movie');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.event_kind not null default 'general',
  title text not null,
  starts_on date not null,
  starts_at time,
  note text,
  movie_id uuid references public.movies (id) on delete set null,
  is_family_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_movie_requires_movie_kind
    check (movie_id is null or kind = 'movie')
);

comment on table public.events is 'Dated calendar events; movie-kind events mirror movies.planned_for and feed the movie-night suggestion band';
comment on column public.events.starts_at is 'null = all-day event (gün boyu)';
comment on column public.events.movie_id is 'null on a movie-kind event means the film has not been picked yet';

create index events_user_id_starts_on_idx on public.events (user_id, starts_on);

-- a movie is scheduled by at most one event, so the event and
-- movies.planned_for can never disagree about which one owns the film günü
create unique index events_user_movie_unique
  on public.events (user_id, movie_id)
  where movie_id is not null;

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_own" on public.events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "events_insert_own" on public.events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "events_update_own" on public.events
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "events_delete_own" on public.events
  for delete to authenticated using ((select auth.uid()) = user_id);

-- calendar module family visibility: an event is a parent record (like
-- life_categories), so it carries its own flag instead of looking one up
create policy "events_select_family" on public.events
  for select to authenticated
  using (public.record_shared_with_me(user_id, 'calendar', is_family_visible));
