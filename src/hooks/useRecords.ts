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
import { recordApi } from '../api/record';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { CreateRecordRequest, PageResponse, UserMovieListItemResponse, WatchRecordResponse } from '../types';
import { queryKeys } from './queryKeys';

// ⚠️ UseInfiniteQueryResult의 TData는 InfiniteData<T>로 감싼 형태다 — 원본 응답 타입을
// 그대로 넣으면 .data.pages가 타입에 잡히지 않는다.
export function useMyRecords(
  userId: number,
): UseInfiniteQueryResult<InfiniteData<PageResponse<UserMovieListItemResponse>>, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.records.ofUser(userId),
    queryFn: ({ pageParam }) => recordApi.ofUser(userId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.last ? undefined : allPages.length),
  });
}

export function useWatchLog(userId: number, movieId: number): UseQueryResult<WatchRecordResponse[], ApiError> {
  // GET .../records/movies/{movieId} — 회차 목록. 페이징 없는 배열 응답.
  // 로그인 의존 훅 — 비로그인 진입 시 401을 내지 않도록 막는다 (§3.4).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.records.ofUserMovie(userId, movieId),
    queryFn: () => recordApi.ofUserMovie(userId, movieId),
    enabled: isAuthed,
  });
}

export function useCreateRecord(): UseMutationResult<void, ApiError, CreateRecordRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => recordApi.create(body).then(() => undefined),
    onSuccess: (_data, variables) => {
      // 시청 기록 생성 → ['records'] · ['movies','detail',movieId] 무효화 (§3.2 무효화 매트릭스)
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(variables.movieId) });
    },
  });
}

export function useDeleteRecord(): UseMutationResult<void, ApiError, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId) => recordApi.remove(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}

interface SetRepresentativeVars {
  recordId: number;
  userId: number;
  movieId: number;
}

export function useSetRepresentative(): UseMutationResult<void, ApiError, SetRepresentativeVars> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId }) => recordApi.setRepresentative(recordId),
    onSuccess: (_data, { userId, movieId }) => {
      // 대표 기록 변경 → ['records','ofUserMovie',userId,movieId] 무효화 (§3.2 무효화 매트릭스)
      queryClient.invalidateQueries({ queryKey: queryKeys.records.ofUserMovie(userId, movieId) });
    },
  });
}
