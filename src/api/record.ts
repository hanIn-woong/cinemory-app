import { api } from './client';
import { EP } from './endpoints';
import type { CreateRecordRequest, PageResponse, UserMovieListItemResponse, WatchRecordResponse } from '../types';

export const recordApi = {
  ofUser: (userId: number, page: number) =>
    api
      .get<PageResponse<UserMovieListItemResponse>>(EP.records.ofUser(userId), { params: { page } })
      .then((r) => r.data),

  // 페이징 없는 배열 응답 — 회차 목록.
  ofUserMovie: (userId: number, movieId: number) =>
    api.get<WatchRecordResponse[]>(EP.records.ofUserMovie(userId, movieId)).then((r) => r.data),

  create: (body: CreateRecordRequest) =>
    api.post<WatchRecordResponse>(EP.records.create, body).then((r) => r.data),

  remove: (recordId: number) => api.delete<void>(EP.records.byId(recordId)).then((r) => r.data),
};
