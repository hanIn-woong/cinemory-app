import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { collectionApi } from '../api/collection';
import { FULL_LOAD_PAGE_SIZE } from '../constants/collectionOrder';
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

// ---------------------------------------------------------------------------------------------
// 순서 편집(docs/collection-order-spec.md §3) — 전량 로드 + 전체 배열 저장
// ---------------------------------------------------------------------------------------------

// last까지 100씩 이어 받는다. 서버 max-page-size(100)가 더 큰 size를 조용히 잘라서, 한 번에
// 크게 받으면 잘린 배열을 저장해 400이 난다(constants/collectionOrder.ts).
async function fetchAllPages<T>(fetchPage: (page: number) => Promise<PageResponse<T>>): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; ; page += 1) {
    const res = await fetchPage(page);
    all.push(...res.content);
    if (res.last) return all;
  }
}

// 편집 진입 시 한 번 부르는 로더 — 화면 상태가 아니라 버튼 핸들러에서 쓰므로 useQuery가 아니라
// fetchQuery다. staleTime 0: 편집은 항상 서버의 현재 순서에서 시작해야 한다.
export function useLoadAllMyCollections(): (userId: number) => Promise<CollectionResponse[]> {
  const queryClient = useQueryClient();
  return (userId) =>
    queryClient.fetchQuery({
      queryKey: queryKeys.collections.ofUserAll(userId),
      queryFn: () => fetchAllPages((page) => collectionApi.ofUser(userId, page, FULL_LOAD_PAGE_SIZE)),
      staleTime: 0,
    });
}

export function useLoadAllCollectionMovies(): (collectionId: number) => Promise<CollectionMovieListItemResponse[]> {
  const queryClient = useQueryClient();
  return (collectionId) =>
    queryClient.fetchQuery({
      queryKey: queryKeys.collections.moviesAll(collectionId),
      queryFn: () => fetchAllPages((page) => collectionApi.movies(collectionId, page, FULL_LOAD_PAGE_SIZE)),
      staleTime: 0,
    });
}

// 낙관적 업데이트 — 무한스크롤 캐시를 새 순서로 다시 자른다. 이미 받아 둔 개수만큼 새 순서의
// 앞부분으로 채우면 된다(편집은 전량을 들고 있으므로 아직 안 받은 항목도 채울 수 있다).
function reorderPages<T>(data: InfiniteData<PageResponse<T>> | undefined, ordered: T[]) {
  if (!data) return data;
  let offset = 0;
  const pages = data.pages.map((page) => {
    const content = ordered.slice(offset, offset + page.content.length);
    offset += page.content.length;
    return { ...page, content };
  });
  return { ...data, pages };
}

async function applyOptimisticOrder<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  key: QueryKey,
  ordered: T[],
): Promise<InfiniteData<PageResponse<T>> | undefined> {
  await queryClient.cancelQueries({ queryKey: key, exact: true });
  const previous = queryClient.getQueryData<InfiniteData<PageResponse<T>>>(key);
  queryClient.setQueryData<InfiniteData<PageResponse<T>>>(key, (data) => reorderPages(data, ordered));
  return previous;
}

interface ReorderCollectionsContext {
  previous?: InfiniteData<PageResponse<CollectionResponse>>;
}

// 변수는 id 배열이 아니라 새 순서의 항목 자체 — 낙관적 업데이트로 캐시를 바로 채우기 위함이다.
export function useReorderCollections(): UseMutationResult<
  void,
  ApiError,
  CollectionResponse[],
  ReorderCollectionsContext
> {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (ordered) => collectionApi.reorder({ collectionIds: ordered.map((c) => c.id!) }),
    onMutate: async (ordered) =>
      userId == null
        ? {}
        : { previous: await applyOptimisticOrder(queryClient, queryKeys.collections.ofUser(userId), ordered) },
    onError: (_err, _ordered, context) => {
      if (userId != null && context?.previous) {
        queryClient.setQueryData(queryKeys.collections.ofUser(userId), context.previous);
      }
    },
    onSettled: () => {
      if (userId != null) queryClient.invalidateQueries({ queryKey: queryKeys.collections.ofUser(userId) });
    },
  });
}

interface ReorderCollectionMoviesVars {
  collectionId: number;
  movieIds: number[];
}

// 컬렉션 편집 모달의 "현재 영화" 탭 저장에서 쓴다(2026-09-28 — 상세 화면의 별도 편집 모드를
// 모달로 통합). 낙관적 업데이트는 하지 않는다: 저장 직후 모달이 닫히고 아래 무효화로 다시
// 받으며, 모달이 들고 있는 항목은 상세 목록 응답의 필드(개봉연도·감독)를 다 갖고 있지 않다.
export function useReorderCollectionMovies(): UseMutationResult<void, ApiError, ReorderCollectionMoviesVars> {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: ({ collectionId, movieIds }) => collectionApi.reorderMovies(collectionId, { movieIds }),
    onSettled: (_data, _err, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.movies(collectionId) });
      // ★ 미리보기 포스터가 position ASC라 영화 순서가 바뀌면 카드의 5장이 바뀐다 — 목록도 무효화
      // 하지 않으면 뒤로 나갔을 때 카드가 옛 포스터를 들고 있다(docs/collection-order-spec.md §3.4).
      if (userId != null) queryClient.invalidateQueries({ queryKey: queryKeys.collections.ofUser(userId) });
    },
  });
}
