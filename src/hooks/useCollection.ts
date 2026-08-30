import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import type { PageResponse } from '../types';
import { notImplemented } from './_stub';
import { queryKeys } from './queryKeys';

// TODO: `npm run gen:api` 이후 CollectionResponse / CollectionMovieListItemResponse로 교체.
type CollectionResponse = unknown;
type CollectionMovieListItemResponse = unknown;

export function useMyCollections(userId: number): UseQueryResult<PageResponse<CollectionResponse>, ApiError> {
  return useQuery({
    queryKey: queryKeys.collections.ofUser(userId),
    queryFn: () => notImplemented('useMyCollections'),
    enabled: false,
  });
}

export function useCollectionMovies(
  collectionId: number,
): UseQueryResult<PageResponse<CollectionMovieListItemResponse>, ApiError> {
  // ⚠️ 컬렉션 단건 조회 API가 없다 — 제목 등은 목록에서 받은 값을 화면 파라미터로 넘겨야 한다.
  return useQuery({
    queryKey: queryKeys.collections.movies(collectionId),
    queryFn: () => notImplemented('useCollectionMovies'),
    enabled: false,
  });
}

export function useCreateCollection(): UseMutationResult<
  CollectionResponse,
  ApiError,
  { title: string; description?: string }
> {
  return useMutation({ mutationFn: () => notImplemented('useCreateCollection') });
}
