import { api } from './client';
import { EP } from './endpoints';
import type {
  AddMoviesToCollectionRequest,
  AddMoviesToCollectionResponse,
  CollectionCreateRequest,
  CollectionMovieListItemResponse,
  CollectionResponse,
  CollectionUpdateRequest,
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

  // ⚠️ 전체 치환 — name·description을 항상 같이 보낸다.
  update: (collectionId: number, body: CollectionUpdateRequest) =>
    api.patch<CollectionResponse>(EP.collections.update(collectionId), body).then((r) => r.data),

  remove: (collectionId: number) => api.delete<void>(EP.collections.remove(collectionId)).then(() => undefined),

  // 벌크·멱등, 최대 50. 이미 담긴 영화는 skippedCount로 온다(에러 아님).
  addMovies: (collectionId: number, body: AddMoviesToCollectionRequest) =>
    api
      .post<AddMoviesToCollectionResponse>(EP.collections.movies(collectionId), body)
      .then((r) => r.data),

  removeMovie: (collectionId: number, movieId: number) =>
    api.delete<void>(EP.collections.removeMovie(collectionId, movieId)).then(() => undefined),
};
