/**
 * TEMPORARY STAND-IN.
 *
 * `src/types/api.d.ts` is meant to be generated from the live backend's
 * `/v3/api-docs` via `npm run gen:api` (docs/M2-frontend-spec.md §4). That
 * requires a reachable backend, which this environment does not have, so the
 * generated file doesn't exist yet and these two DTOs are hand-written as a
 * minimal unblock for `authStore`/`client.ts`.
 *
 * Once codegen has run, delete this file's contents and replace with:
 *
 *   import type { components } from './api';
 *   type S = components['schemas'];
 *   export type TokenResponse = S['TokenResponse'];
 *   export type UserResponse  = S['UserResponse'];
 *   // … other aliases as needed
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  profileImage: string | null;
  privacySetting: PrivacySetting;
}

// 요청/응답 바디는 docs/M2-frontend-spec.md §6.1에 명시된 계약 그대로다 (추측 아님).
export interface SignUpRequest {
  email: string;
  rawPassword: string;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface NonceResponse {
  nonce: string;
  expiresIn: number; // seconds, 300
}

export interface OAuthLoginRequest {
  idToken: string;
  nonce: string;
}

// enum 값은 docs/M2-frontend-spec.md §5.6에 명시된 그대로다.
export type PrivacySetting = 'PRIVATE' | 'FRIENDS' | 'PUBLIC';
export type WatchType = 'THEATER' | 'OTT' | 'ETC';
export type RankType = 'DAILY' | 'WEEKLY' | 'WEEKEND';
export type TargetType = 'COLLECTION' | 'REVIEW';
export type RoleTier = 'LEAD' | 'SUPPORTING' | 'MINOR' | 'EXTRA';
export type OAuthProvider = 'KAKAO';

// 시청 기록 생성 요청 — docs/M2-frontend-spec.md §9.3 모달 필드 그대로.
// watchType === 'OTT'면 ottPlatformId 필수, 그 외에는 있으면 안 된다.
export interface CreateRecordRequest {
  movieId: number;
  watchDate?: string | null;
  watchType?: WatchType;
  ottPlatformId?: number;
  placeDetail?: string;
  rating?: number; // 0.0~10.0
  note?: string;
}

// 리뷰 upsert 요청 — docs/M2-frontend-spec.md §5.3.
// movieId는 PUT /api/movies/{movieId}/review의 경로 변수라 바디에 없다.
export interface WriteReviewRequest {
  rating: number; // 0.0~10.0, not null
  content: string; // max 2000
}

// 페이징 응답 래퍼 — docs/M2-frontend-spec.md §5.1. 무한스크롤은 `last`로 판정한다
// (content.length===0 아님 — 비공개 리뷰가 필터링되면 size보다 적게 올 수 있다).
export interface PageResponse<T> {
  content: T[];
  page: number; // 0-based (움직임: search만 1-based)
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// docs/M2-frontend-spec.md §5.2 — 검색 registered 섹션 항목.
export interface MovieSummary {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
}

// §5.2 — 검색 suggestions 섹션 항목. movieId가 없는 것이 "미등록"의 신호다.
export interface MovieSuggestion {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
}

export interface MovieSearchResponse {
  registered: PageResponse<MovieSummary>;
  suggestions: MovieSuggestion[]; // page 1에서만 채워진다
}
