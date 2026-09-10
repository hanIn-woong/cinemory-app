/**
 * `npm run gen:api`로 생성된 `src/types/api.d.ts`의 별칭 모음이다. 필드명은
 * 전부 생성 스키마에서 그대로 가져오고, 손으로 다시 적지 않는다
 * (docs/M2A-foundation-spec.md §11 — DTO를 추측하면 반드시 어긋난다).
 * `gen:api`를 다시 돌릴 때마다 아래 별칭들이 여전히 유효한지 확인한다.
 */
import type { components } from './api';

type S = components['schemas'];

// 로그인/재발급 응답 — 생성 스키마는 세 필드 모두 optional이지만, 성공 응답에서는
// 항상 채워진다는 백엔드 계약(docs/M2-frontend-spec.md §6.1)을 반영해 Required로 좁힌다.
// 필드명 자체는 생성 스키마 그대로다.
export type TokenResponse = Required<S['TokenResponse']>;

export type UserResponse = S['UserResponse'];

export type SignUpRequest = S['SignUpLocalRequest'];
export type LoginRequest = S['LoginRequest'];
export type NonceResponse = S['NonceResponse'];
export type OAuthLoginRequest = S['OAuthLoginRequest'];
export type ReissueRequest = S['ReissueRequest'];
export type LogoutRequest = S['LogoutRequest'];

export type PrivacySetting = NonNullable<S['UserResponse']['privacySetting']>;

// 마이페이지/설정 — MyPage §5.6.
export type NicknameChangeRequest = S['NicknameChangeRequest'];
export type PrivacyChangeRequest = S['PrivacyChangeRequest'];
export type PasswordChangeRequest = S['PasswordChangeRequest'];
export type WatchType = NonNullable<S['WatchRecordCreateRequest']['watchType']>;
export type RankType = NonNullable<S['BoxOfficeResponse']['rankType']>;
export type TargetType = S['CommentCreateRequest']['targetType'];
export type RoleTier = NonNullable<S['ActorResponse']['roleTier']>;

// 백엔드 스키마에 provider enum이 없다(경로 변수가 string) — 현재 지원하는 값만 직접 명시.
export type OAuthProvider = 'KAKAO';

// 시청 기록 생성 요청 — docs/M2-frontend-spec.md §9.3.
// watchType === 'OTT'면 ottPlatformId 필수, 그 외에는 있으면 안 된다(생성 스키마엔 없는 제약).
export type CreateRecordRequest = S['WatchRecordCreateRequest'];

// ⚠️ PATCH /api/records/{recordId}는 전체 치환이다 — 생략한 필드는 null로 지워진다
// (B-15). movieId·representative는 이 요청으로 바꿀 수 없다. 항상 전체 필드를 채워 보낸다.
export type UpdateRecordRequest = S['WatchRecordUpdateRequest'];

// 리뷰 upsert 요청. movieId는 PUT /api/movies/{movieId}/review의 경로 변수라 바디에 없다.
export type WriteReviewRequest = S['ReviewWriteRequest'];

// 페이지네이션 래퍼 — 백엔드는 제네릭이 아니라 PageResponseXxx를 응답 타입별로 각각
// 생성하지만, 필드 구성(content/page/size/totalElements/totalPages/first/last)은
// 전부 동일함을 생성 결과로 확인했다. 무한스크롤은 `last`로 판정한다
// (content.length===0 아님 — 비공개 리뷰가 필터링되면 size보다 적게 올 수 있다).
export interface PageResponse<T> {
  content: T[];
  page: number; // 0-based (예외: search만 1-based)
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type MovieSummary = S['MovieSummaryResponse'];
export type MovieSuggestion = S['MovieSearchSuggestionResponse'];

// {registered, suggestions} 2섹션. registered만 페이징되고 이 엔드포인트만 page가 1-based.
export type MovieSearchResponse = S['MovieSearchResponse'];

export type MovieDetailResponse = S['MovieDetailResponse'];

// 회차별 시청 기록. WatchRecordResponse는 배열 그대로 온다(페이징 없음).
export type WatchRecordResponse = S['WatchRecordResponse'];

// `GET /api/users/{userId}/records` 목록 항목 — 대표 기록만 담긴다.
export type UserMovieListItemResponse = S['UserMovieListItemResponse'];

export type ReviewResponse = S['ReviewResponse'];

export type WishListItemResponse = S['WishListItemResponse'];

export type CollectionResponse = S['CollectionResponse'];
export type CollectionCreateRequest = S['CollectionCreateRequest'];

// ⚠️ 전체 치환이다 — description을 생략하면 지워진다. 편집 폼은 항상 두 필드를 다 싣는다
// (docs/M2C-screens-spec.md §2).
export type CollectionUpdateRequest = S['CollectionUpdateRequest'];

// ⚠️ 컬렉션 단건 조회 API가 없다 — 제목 등은 목록에서 받은 값을 화면 파라미터로 넘겨야 한다.
export type CollectionMovieListItemResponse = S['CollectionMovieListItemResponse'];

// 벌크·멱등, 최대 50. 1편 추가도 배열로 보낸다(docs/M2C-screens-spec.md §2).
export type AddMoviesToCollectionRequest = S['AddMoviesToCollectionRequest'];
export type AddMoviesToCollectionResponse = S['AddMoviesToCollectionResponse'];
