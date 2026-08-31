import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { recordApi } from '../api/record';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { CreateRecordRequest, UserMovieListItemResponse, WatchRecordResponse } from '../types';
import { queryKeys } from './queryKeys';

export function useMyRecords(userId: number): UseInfiniteQueryResult<UserMovieListItemResponse, ApiError> {
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
