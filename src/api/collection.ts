import { api } from './client';
import { EP } from './endpoints';
import type {
  CollectionCreateRequest,
  CollectionMovieListItemResponse,
  CollectionResponse,
  PageResponse,
} from '../types';

export const collectionApi = {
  ofUser: (userId: number, page: number) =>
    api
      .get<PageResponse<CollectionResponse>>(EP.collections.ofUser(userId), { params: { page } })
      .then((r) => r.data),

  // ⚠️ 컬렉션 단건 조회 API가 없다 — 제목 등은 목록에서 받은 값을 화면 파라미터로 넘겨야 한다.
  movies: (collectionId: number, page: number) =>
    api
      .get<PageResponse<CollectionMovieListItemResponse>>(EP.collections.movies(collectionId), { params: { page } })
      .then((r) => r.data),

  create: (body: CollectionCreateRequest) =>
    api.post<CollectionResponse>(EP.collections.create, body).then((r) => r.data),
};
