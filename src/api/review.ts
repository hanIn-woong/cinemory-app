import { api } from './client';
import { EP } from './endpoints';
import type { ReviewResponse, WriteReviewRequest } from '../types';

export const reviewApi = {
  // ⚠️ 이 엔드포인트만 리뷰가 있으면 200 + 바디, 없으면 204 + 바디 없음.
  // axios는 204에서 data를 ''로 준다 — 그대로 흘리면 빈 문자열이 ReviewResponse 행세를 한다.
  // "리뷰 없음"은 에러가 아니라 정상 상태이므로 null로 정규화한다 (docs/M2B-screens-spec.md §2).
  myReview: (movieId: number) =>
    api
      .get<ReviewResponse>(EP.reviews.me, { params: { movieId } })
      .then((r) => (r.status === 204 ? null : r.data)),

  // PUT /api/movies/{movieId}/review — upsert. movieId는 경로 변수라 바디엔 없다.
  write: (movieId: number, body: WriteReviewRequest) =>
    api.put<ReviewResponse>(EP.movies.review(movieId), body).then((r) => r.data),

  remove: (movieId: number) => api.delete<void>(EP.movies.review(movieId)).then((r) => r.data),
};
