import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { collectionApi } from '../api/collection';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type {
  AddMoviesToCollectionRequest,
  AddMoviesToCollectionResponse,
  CollectionCreateRequest,
  CollectionMovieListItemResponse,
  CollectionResponse,
  CollectionUpdateRequest,
  PageResponse,
} from '../types';
import { queryKeys } from './queryKeys';

// ⚠️ UseInfiniteQueryResult의 TData는 InfiniteData<T>로 감싼 형태다 — 원본 응답 타입을
// 그대로 넣으면 .data.pages가 타입에 잡히지 않는다(useMyWishes와 동일 패턴).
export function useMyCollections(
  userId: number,
): UseInfiniteQueryResult<InfiniteData<PageResponse<CollectionResponse>>, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useInfiniteQuery({
    queryKey: queryKeys.collections.ofUser(userId),
    queryFn: ({ pageParam }) => collectionApi.ofUser(userId, pageParam),
    initialPageParam: 0,
    // ⚠️ allPages.length + 1이 아니다 — 컬렉션은 0-based다. +1은 검색 엔드포인트(1-based) 전용
    // (docs/M2C-screens-spec.md §3).
    getNextPageParam: (lastPage, allPages) => (lastPage.last ? undefined : allPages.length),
    enabled: isAuthed && userId != null,
  });
}

export function useCollectionMovies(
  collectionId: number,
): UseInfiniteQueryResult<InfiniteData<PageResponse<CollectionMovieListItemResponse>>, ApiError> {
  // ⚠️ 컬렉션 단건 조회 API가 없다 — 제목 등은 목록에서 받은 값을 화면 파라미터로 넘겨야 한다.
  // 백엔드는 permitAll이지만 M2에서는 내 컬렉션만 들어가므로 게이팅을 같이 건다.
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useInfiniteQuery({
    queryKey: queryKeys.collections.movies(collectionId),
    queryFn: ({ pageParam }) => collectionApi.movies(collectionId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.last ? undefined : allPages.length),
    enabled: isAuthed,
  });
}

export function useCreateCollection(): UseMutationResult<CollectionResponse, ApiError, CollectionCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => collectionApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

interface UpdateCollectionVars {
  collectionId: number;
  body: CollectionUpdateRequest;
}

export function useUpdateCollection(): UseMutationResult<CollectionResponse, ApiError, UpdateCollectionVars> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, body }) => collectionApi.update(collectionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDeleteCollection(): UseMutationResult<void, ApiError, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId) => collectionApi.remove(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

interface AddMoviesToCollectionVars {
  collectionId: number;
  body: AddMoviesToCollectionRequest;
}

// ★ movieCount가 목록 응답(CollectionResponse)에 들어 있다 — 상세만 무효화하면 목록의
// "영화 N편"이 옛 값으로 남는다(docs/M2C-screens-spec.md §3.1).
export function useAddMoviesToCollection(): UseMutationResult<
  AddMoviesToCollectionResponse,
  ApiError,
  AddMoviesToCollectionVars
> {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ collectionId, body }) => collectionApi.addMovies(collectionId, body),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.movies(collectionId) });
      if (userId != null) queryClient.invalidateQueries({ queryKey: queryKeys.collections.ofUser(userId) });
    },
  });
}

interface RemoveMovieFromCollectionVars {
  collectionId: number;
  movieId: number;
}

export function useRemoveMovieFromCollection(): UseMutationResult<void, ApiError, RemoveMovieFromCollectionVars> {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ collectionId, movieId }) => collectionApi.removeMovie(collectionId, movieId),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.movies(collectionId) });
      if (userId != null) queryClient.invalidateQueries({ queryKey: queryKeys.collections.ofUser(userId) });
    },
  });
}
