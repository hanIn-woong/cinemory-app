import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { wishlistApi } from '../api/wishlist';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { PageResponse, WishListItemResponse, WishSort } from '../types';
import { queryKeys } from './queryKeys';

export function useWishToggle(): UseMutationResult<{ wished: boolean }, ApiError, number> {
  // POST /api/movies/{movieId}/wish — 토글 단일 엔드포인트. 낙관적 업데이트 후 무효화.
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movieId) => wishlistApi.toggle(movieId),
    onMutate: async (movieId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wishes.me(movieId) });
      const previous = queryClient.getQueryData<{ wished: boolean }>(queryKeys.wishes.me(movieId));
      queryClient.setQueryData(queryKeys.wishes.me(movieId), { wished: !previous?.wished });
      return { previous };
    },
    onError: (_err, movieId, context) => {
      if (context) queryClient.setQueryData(queryKeys.wishes.me(movieId), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishes'] });
    },
  });
}

export function useIsWished(movieId: number): UseQueryResult<{ wished: boolean }, ApiError> {
  // 로그인 의존 훅 — 비로그인 진입 시 401을 내지 않도록 막는다 (§3.4).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.wishes.me(movieId),
    queryFn: () => wishlistApi.isWished(movieId),
    enabled: isAuthed,
  });
}

// ⚠️ UseInfiniteQueryResult의 TData는 InfiniteData<T>로 감싼 형태다 — 원본 응답 타입을
// 그대로 넣으면 .data.pages가 타입에 잡히지 않는다.
export function useMyWishes(
  userId: number,
  sort: WishSort = 'RECENT',
): UseInfiniteQueryResult<InfiniteData<PageResponse<WishListItemResponse>>, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.wishes.ofUser(userId, sort),
    queryFn: ({ pageParam }) => wishlistApi.ofUser(userId, pageParam, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.last ? undefined : allPages.length),
    // 정렬 변경 시 이전 목록 유지 — useMyRecords와 같은 이유.
    placeholderData: keepPreviousData,
  });
}
