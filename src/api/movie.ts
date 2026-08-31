import { api } from './client';
import { EP } from './endpoints';
import type { MovieDetailResponse, MovieSearchResponse } from '../types';

export const movieApi = {
  search: (query: string, page: number, year?: number) =>
    api.get<MovieSearchResponse>(EP.movies.search, { params: { query, page, year } }).then((r) => r.data),

  detail: (movieId: number) =>
    api.get<MovieDetailResponse>(EP.movies.detail(movieId)).then((r) => r.data),

  sync: (tmdbId: number) =>
    api.post<{ movieId: number }>(EP.movies.sync, { tmdbId }).then((r) => r.data),
};
