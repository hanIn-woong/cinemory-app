import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { reviewApi } from '../api/review';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { PageResponse, ReviewResponse, WriteReviewRequest } from '../types';
import { queryKeys } from './queryKeys';

export function useMovieReviews(movieId: number): UseQueryResult<PageResponse<ReviewResponse>, ApiError> {
  // GET /api/movies/{movieId}/reviews — 공개 리뷰 목록. 비로그인도 볼 수 있다(§9.3).
  return useQuery({
    queryKey: ['movies', 'reviews', movieId],
    queryFn: () => reviewApi.ofMovie(movieId, 0),
  });
}

export function useMyReview(movieId: number): UseQueryResult<ReviewResponse | null, ApiError> {
  // GET /api/reviews/me?movieId= — 204는 "리뷰 없음"(정상)이므로 null로 매핑한다.
  // 로그인 의존 훅 — 비로그인 진입 시 401을 내지 않도록 막는다 (§3.4).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.reviews.me(movieId),
    queryFn: () => reviewApi.myReview(movieId),
    enabled: isAuthed,
  });
}

export function useWriteReview(movieId: number): UseMutationResult<ReviewResponse, ApiError, WriteReviewRequest> {
  // PUT /api/movies/{movieId}/review — upsert. POST 아님. movieId는 경로 변수라
  // 바디(WriteReviewRequest)에는 없다 — 훅 호출 시점에 고정한다.
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => reviewApi.write(movieId, body),
    onSuccess: () => {
      // 리뷰 upsert → ['reviews','me',movieId] · ['movies','reviews',movieId] 무효화 (§3.2)
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.me(movieId) });
      queryClient.invalidateQueries({ queryKey: ['movies', 'reviews', movieId] });
    },
  });
}

export function useDeleteReview(): UseMutationResult<void, ApiError, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movieId) => reviewApi.remove(movieId),
    onSuccess: (_data, movieId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.me(movieId) });
      queryClient.invalidateQueries({ queryKey: ['movies', 'reviews', movieId] });
    },
  });
}
