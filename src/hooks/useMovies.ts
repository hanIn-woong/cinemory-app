import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { movieApi } from '../api/movie';
import type { ApiError } from '../api/client';
import type { MovieDetailResponse, MovieSearchResponse, MovieSummary } from '../types';
import { queryKeys } from './queryKeys';

// ⚠️ UseInfiniteQueryResult의 TData는 InfiniteData<T>로 감싼 형태다 — 원본 응답 타입을
// 그대로 넣으면 .data.pages가 타입에 잡히지 않는다.
export function useMovieSearch(
  query: string,
  year?: number,
): UseInfiniteQueryResult<InfiniteData<MovieSearchResponse>, ApiError> {
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

// 홈 배경 폴백 소스(B-17) — permitAll이라 게스트도 그대로 쓴다. `enabled`는 로그인 사용자의
// 기록이 충분한지 알기 전까지 낭비 호출을 미루는 용도다(useHomeBackground).
export function useRandomMovies(size: number, enabled = true): UseQueryResult<MovieSummary[], ApiError> {
  return useQuery({
    queryKey: queryKeys.movies.random(size),
    queryFn: () => movieApi.random(size),
    enabled,
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
