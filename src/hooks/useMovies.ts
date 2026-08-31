import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { movieApi } from '../api/movie';
import type { ApiError } from '../api/client';
import type { MovieDetailResponse, MovieSearchResponse } from '../types';
import { queryKeys } from './queryKeys';

export function useMovieSearch(query: string, year?: number): UseInfiniteQueryResult<MovieSearchResponse, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.movies.search(query, year),
    queryFn: ({ pageParam }) => movieApi.search(query, pageParam, year),
    initialPageParam: 1, // ★ useMovieSearch만 1-based
    // ⚠️ registered.page(0-based)가 아니라 allPages.length + 1로 계산한다 — 섞으면 페이지를
    // 건너뛰거나 중복 로드한다 (docs/M2B-screens-spec.md §3.3).
    getNextPageParam: (lastPage, allPages) =>
      lastPage.registered?.last ?? true ? undefined : allPages.length + 1,
    enabled: query.trim().length > 0,
  });
}

export function useMovieDetail(movieId: number): UseQueryResult<MovieDetailResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.movies.detail(movieId),
    queryFn: () => movieApi.detail(movieId),
  });
}

export function useMovieSync(): UseMutationResult<{ movieId: number }, ApiError, { tmdbId: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tmdbId }) => movieApi.sync(tmdbId),
    onSuccess: () => {
      // 미등록 영화 sync → 다음 검색에서 registered로 올라온다 (§3.2 무효화 매트릭스)
      queryClient.invalidateQueries({ queryKey: ['movies', 'search'] });
    },
  });
}
