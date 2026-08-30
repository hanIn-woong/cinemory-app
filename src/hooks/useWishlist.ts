import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import { notImplemented } from './_stub';
import { queryKeys } from './queryKeys';

// TODO: `npm run gen:api` 이후 WishListItemResponse로 교체.
type WishListItemResponse = unknown;

export function useWishToggle(): UseMutationResult<{ wished: boolean }, ApiError, number> {
  // POST /api/movies/{movieId}/wish — 토글 단일 엔드포인트. 낙관적 업데이트 후 무효화(M2-B).
  return useMutation({ mutationFn: () => notImplemented('useWishToggle') });
}

export function useIsWished(movieId: number): UseQueryResult<{ wished: boolean }, ApiError> {
  return useQuery({
    queryKey: queryKeys.wishes.me(movieId),
    queryFn: () => notImplemented('useIsWished'),
    enabled: false,
  });
}

export function useMyWishes(userId: number): UseInfiniteQueryResult<WishListItemResponse, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.wishes.ofUser(userId),
    queryFn: () => notImplemented('useMyWishes'),
    initialPageParam: 0,
    getNextPageParam: () => notImplemented('useMyWishes.getNextPageParam'),
    enabled: false,
  });
}
