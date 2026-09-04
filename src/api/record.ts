import { api } from './client';
import { EP } from './endpoints';
import type {
  CreateRecordRequest,
  PageResponse,
  UpdateRecordRequest,
  UserMovieListItemResponse,
  WatchRecordResponse,
} from '../types';

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

  // ⚠️ 전체 치환 — 생략한 필드는 null로 지워진다. 호출부가 항상 전체 필드를 채워 보내야 한다.
  update: (recordId: number, body: UpdateRecordRequest) =>
    api.patch<WatchRecordResponse>(EP.records.byId(recordId), body).then((r) => r.data),

  setRepresentative: (recordId: number) =>
    api.patch<void>(EP.records.representative(recordId)).then((r) => r.data),
};
