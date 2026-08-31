import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { collectionApi } from '../api/collection';
import type { ApiError } from '../api/client';
import type { CollectionCreateRequest, CollectionMovieListItemResponse, CollectionResponse, PageResponse } from '../types';
import { queryKeys } from './queryKeys';

export function useMyCollections(userId: number): UseQueryResult<PageResponse<CollectionResponse>, ApiError> {
  return useQuery({
    queryKey: queryKeys.collections.ofUser(userId),
    queryFn: () => collectionApi.ofUser(userId, 0),
  });
}

export function useCollectionMovies(
  collectionId: number,
): UseQueryResult<PageResponse<CollectionMovieListItemResponse>, ApiError> {
  // ⚠️ 컬렉션 단건 조회 API가 없다 — 제목 등은 목록에서 받은 값을 화면 파라미터로 넘겨야 한다.
  return useQuery({
    queryKey: queryKeys.collections.movies(collectionId),
    queryFn: () => collectionApi.movies(collectionId, 0),
  });
}

export function useCreateCollection(): UseMutationResult<CollectionResponse, ApiError, CollectionCreateRequest> {
  return useMutation({ mutationFn: (body) => collectionApi.create(body) });
}
