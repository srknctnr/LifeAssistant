-- Genres per movie (Turkish canonical names, auto-filled from TMDB/OMDb on
-- add). Feeds the genre filter now and the taste-profile/recommendation
-- engine later.

alter table public.movies
  add column genres text[] not null default '{}';

comment on column public.movies.genres is 'Canonical Turkish genre names; basis for filtering and the future recommendation engine';
