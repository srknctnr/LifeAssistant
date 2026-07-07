-- Phase 2, movies module v1: personal watchlist with watched status,
-- 1-5 star rating and an optional planned watch date. tmdb_id, poster_path
-- and release_date are filled once TMDB search lands (slice 2).

create type public.movie_status as enum ('to_watch', 'watched');

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  tmdb_id integer,
  poster_path text,
  release_date date,
  status public.movie_status not null default 'to_watch',
  rating smallint check (rating between 1 and 5),
  external_rating numeric(3, 1) check (external_rating between 0 and 10),
  watched_on date,
  planned_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.movies is 'Personal watchlist; planned_for feeds the movie-night reminders';

create index movies_user_id_idx on public.movies (user_id);

-- a TMDB title can be on the list only once per user; manual entries are free
create unique index movies_user_tmdb_unique
  on public.movies (user_id, tmdb_id)
  where tmdb_id is not null;

create trigger set_movies_updated_at
  before update on public.movies
  for each row execute function public.set_updated_at();

alter table public.movies enable row level security;

create policy "movies_select_own" on public.movies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "movies_insert_own" on public.movies
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "movies_update_own" on public.movies
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "movies_delete_own" on public.movies
  for delete to authenticated using ((select auth.uid()) = user_id);
