-- Which service the external rating came from, so the UI can label it
-- honestly (IMDb via OMDb lookup, or TMDB community score as fallback).

alter table public.movies
  add column external_source text check (external_source in ('imdb', 'tmdb'));

comment on column public.movies.external_source is 'Source of external_rating: imdb (via OMDb) or tmdb (community average); null for manual entries';
