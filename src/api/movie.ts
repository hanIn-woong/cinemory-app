import { api } from './client';
import { EP } from './endpoints';
import type { MovieDetailResponse, MovieSearchResponse, MovieSummary } from '../types';

export const movieApi = {
  search: (query: string, page: number, year?: number) =>
    api.get<MovieSearchResponse>(EP.movies.search, { params: { query, page, year } }).then((r) => r.data),

  detail: (movieId: number) =>
    api.get<MovieDetailResponse>(EP.movies.detail(movieId)).then((r) => r.data),

  sync: (tmdbId: number) =>
    api.post<{ movieId: number }>(EP.movies.sync, { tmdbId }).then((r) => r.data),

  // 홈 배경 폴백 소스(B-17) — 페이징 없는 배열. 정렬이 고정이라 호출부에서 셔플한다(§9.1).
  random: (size?: number) =>
    api.get<MovieSummary[]>(EP.movies.random, { params: { size } }).then((r) => r.data),
};
