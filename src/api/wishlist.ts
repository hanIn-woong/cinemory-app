import { api } from './client';
import { EP } from './endpoints';
import type { PageResponse, WishListItemResponse } from '../types';

export const wishlistApi = {
  // POST /api/movies/{movieId}/wish — 토글 단일 엔드포인트(찜/찜 해제 공용).
  toggle: (movieId: number) =>
    api.post<{ wished: boolean }>(EP.movies.wish(movieId)).then((r) => r.data),

  isWished: (movieId: number) =>
    api.get<{ wished: boolean }>(EP.wishes.me(movieId)).then((r) => r.data),

  ofUser: (userId: number, page: number) =>
    api
      .get<PageResponse<WishListItemResponse>>(EP.wishes.ofUser(userId), { params: { page } })
      .then((r) => r.data),
};
