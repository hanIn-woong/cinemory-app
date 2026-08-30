import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import type { WriteReviewRequest } from '../types';
import { notImplemented } from './_stub';
import { queryKeys } from './queryKeys';

// TODO: `npm run gen:api` 이후 ReviewResponse로 교체.
type ReviewResponse = unknown;

export function useMyReview(movieId: number): UseQueryResult<ReviewResponse | null, ApiError> {
  // GET /api/reviews/me?movieId= — 204는 "리뷰 없음"(정상)이므로 null로 매핑한다.
  return useQuery({
    queryKey: queryKeys.reviews.me(movieId),
    queryFn: () => notImplemented('useMyReview'),
    enabled: false,
  });
}

export function useWriteReview(movieId: number): UseMutationResult<ReviewResponse, ApiError, WriteReviewRequest> {
  // PUT /api/movies/{movieId}/review — upsert. POST 아님. movieId는 경로 변수라
  // 바디(WriteReviewRequest)에는 없다 — 훅 호출 시점에 고정한다.
  return useMutation({ mutationFn: () => notImplemented(`useWriteReview(${movieId})`) });
}

export function useDeleteReview(): UseMutationResult<void, ApiError, number> {
  return useMutation({ mutationFn: () => notImplemented('useDeleteReview') });
}
