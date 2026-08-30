import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import type { CreateRecordRequest } from '../types';
import { notImplemented } from './_stub';
import { queryKeys } from './queryKeys';

// TODO: `npm run gen:api` 이후 UserMovieListItemResponse / WatchRecordResponse로 교체.
type UserMovieListItemResponse = unknown;
type WatchRecordResponse = unknown;

export function useMyRecords(userId: number): UseInfiniteQueryResult<UserMovieListItemResponse, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.records.ofUser(userId),
    queryFn: () => notImplemented('useMyRecords'),
    initialPageParam: 0,
    getNextPageParam: () => notImplemented('useMyRecords.getNextPageParam'),
    enabled: false,
  });
}

export function useWatchLog(userId: number, movieId: number): UseQueryResult<WatchRecordResponse[], ApiError> {
  // GET .../records/movies/{movieId} — 회차 목록. 페이징 없는 배열 응답.
  return useQuery({
    queryKey: queryKeys.records.ofUserMovie(userId, movieId),
    queryFn: () => notImplemented('useWatchLog'),
    enabled: false,
  });
}

export function useCreateRecord(): UseMutationResult<void, ApiError, CreateRecordRequest> {
  return useMutation({ mutationFn: () => notImplemented('useCreateRecord') });
}

export function useDeleteRecord(): UseMutationResult<void, ApiError, number> {
  return useMutation({ mutationFn: () => notImplemented('useDeleteRecord') });
}
