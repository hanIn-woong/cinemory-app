import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import type { MovieSearchResponse } from '../types';
import { notImplemented } from './_stub';
import { queryKeys } from './queryKeys';

// `MovieDetailResponse`는 `npm run gen:api`로 생성될 때까지 필드를 확정하지 않는다
// (docs/M2-frontend-spec.md §4 — DTO를 손으로 다시 쓰지 않는다).
type MovieDetailResponse = unknown;

export function useMovieSearch(query: string, year?: number): UseInfiniteQueryResult<MovieSearchResponse, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.movies.search(query, year),
    queryFn: () => notImplemented('useMovieSearch'),
    initialPageParam: 1, // ★ useMovieSearch만 1-based
    getNextPageParam: () => notImplemented('useMovieSearch.getNextPageParam'),
    enabled: false,
  });
}

export function useMovieDetail(movieId: number): UseQueryResult<MovieDetailResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.movies.detail(movieId),
    queryFn: () => notImplemented('useMovieDetail'),
    enabled: false,
  });
}

export function useMovieSync(): UseMutationResult<{ movieId: number }, ApiError, { tmdbId: number }> {
  return useMutation({ mutationFn: () => notImplemented('useMovieSync') });
}
