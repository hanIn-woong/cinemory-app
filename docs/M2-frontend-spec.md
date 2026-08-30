# CineMory M2 — 프론트엔드 설계 스펙

> 대상 리포: `cinemory-app` (Expo SDK 56 / RN 0.85 / React 19.2 / TypeScript)
> 시각 기준: `cinemory-wireframe` (Figma Make 산출물, React + Vite + Tailwind v4)
> API 기준: `cinemory-backend` — **`docs/controller-layer-spec.md`가 API 표면의 단일 출처**
> 우선순위 기준: `CineMory_기획노트.md` **4-M2절**
>
> 이 문서는 **구현 스펙**이다. Claude Code가 이 문서를 근거로 코드를 작성한다.

---

## 0. v1 → v2에서 바뀐 것 (2026-08-28)

**v1은 백엔드가 미구현이라는 잘못된 전제로 작성됐다.** 실제로는 Step S·Step5가 완료돼
컨트롤러 16개와 `/v3/api-docs`가 이미 존재한다. v1이 지어낸 API 계약은 폐기한다.

| 항목 | v1 (오류) | v2 (실제) |
|---|---|---|
| 도메인 타입 | 손으로 작성한 `MovieSummary` 등 | **`openapi-typescript` 생성** (§4) |
| 별점 스케일 | 사용자 1~5 / 외부 0~10 | **둘 다 `Double` 0.0~10.0** (§7.3) |
| 시청 기록 | `WatchRecord`에 `review` 필드 포함 | **`watch_record`(회차별·비공개) ↔ `review`(영화당 1개·공개) 별도 리소스** |
| 검색 | `Page<MovieSummary>` | **`{registered, suggestions}` 2섹션 + 온디맨드 sync** (§5.2) |
| 찜 | `POST`/`DELETE` 분리 | **`POST /api/movies/{id}/wish` 토글 단일** |
| 소셜 피드 | `GET /api/feed` | **그런 API는 없다** (§11) |
| 리포트·추천·캘린더 | 엔드포인트 설계함 | **전부 미구현 (M3)** (§11) |
| 화면 순서 | 임의 M2-B/C | **기획노트 4-M2의 1군/2군/3군 준수** (§2) |
| 폴더 구조 | flat `screens/` | **기획노트 6절의 도메인별 `screens/*/`** (§3) |

---

## 1. 확정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 스타일링 | **NativeWind v4** (Expo 56 빌드 실패 시 **Uniwind**) | 와이어프레임 Tailwind 클래스 이식. 토큰+프리미티브로 격리 |
| 네비게이션 | `@react-navigation/native-stack` + `bottom-tabs` (설치 완료) | 와이어프레임의 `useState` 조건부 렌더링을 스택으로 평탄화 |
| 타입 | **`openapi-typescript`로 `/v3/api-docs`에서 생성** | 5-7 D에서 검증된 경로. 손으로 쓰면 즉시 어긋난다 |
| 서버 상태 | `@tanstack/react-query` v5 | 기획노트 6절이 이미 지정 |
| 클라이언트 상태 | `zustand` | 기획노트 6절이 이미 지정 |
| 토큰 저장 | `expo-secure-store` | 리프레시 토큰을 `AsyncStorage`에 두지 않는다 |
| 아이콘 | `lucide-react-native` | 와이어프레임 아이콘명 그대로 |
| 차트 | `react-native-gifted-charts` + `react-native-svg` | recharts 대체 (2군에서 필요) |
| 지도 | `react-native-webview` + Kakao Maps JS SDK, **인터페이스 격리** | §13 |
| 브랜치 | `develop`에서 작업, `feature/*` 분기 | 기획노트 5절. **현재 `main`에 직접 커밋 중이므로 정리 필요** |

---

## 2. 화면 우선순위 — 기획노트 4-M2 준수

> *"9개를 다 만들면 11월까지 못 끝낸다."* 발표는 11월, 개강 후 가용 시간은 방학의 절반 이하.
> **핵심 동선은 로그인 → 검색 → 기록 → 내 기록 목록**이고, 이는 앱의 정체성이자
> **백엔드가 완비된 부분**이다.

| 군 | 시기 | 화면 | 백엔드 상태 |
|---|---|---|---|
| **1군** | 9월 | `mypage`(로그인) · `search` · `records` · `home` | ✅ **완비** |
| **2군** | 10월 | `wishlist` · `collection` · `report` | 위시·컬렉션 ✅ / **리포트 ❌ (M3-a 미구현)** |
| **3군** | 여유 시 | `social` · `cinemap` · `recommend` | **셋 다 막혀 있음 — §11** |

**3군을 지금 만들면 안 되는 이유** (전부 기획노트에 명시)

- `cinemap` — `GET /api/theaters/nearby`는 구현됐지만 **`theater` 테이블이 비어 있다**
  (`TheaterSeedService` 호출 엔드포인트 부재, 좌표계 EPSG:5174→WGS84 확인 보류). **빈 지도가 나온다.**
- `recommend` — M3-b 설계가 백지. R-2(규칙 기반 vs 임베딩)가 미결.
- `social` — 팔로우·댓글 API는 있으나 **와이어프레임이 그린 "활동 피드"에 해당하는
  엔드포인트가 없다.** §11 참고.

---

## 3. 폴더 구조

기획노트 6절 구조를 유지하고 필요한 것만 추가한다. **`screens/`는 도메인별 하위 폴더**다.

```
src/
├── api/
│   ├── client.ts             # axios 인스턴스 + 인증 인터셉터 (§6.3)
│   ├── endpoints.ts          # 경로 상수 단일 출처
│   ├── auth.ts    movie.ts   record.ts   review.ts
│   ├── wishlist.ts  collection.ts  social.ts
│   ├── cinemap.ts  report.ts  recommend.ts   ← 3군/M3용 스텁
│   └── mock/                 # 실제 구현과 동일 시그니처
├── components/
│   ├── primitives/           # Screen · Txt · Card · Button — 스타일링 격리 계층
│   ├── movie/                # PosterImage · MovieListItem · MovieGridItem · RatingStars
│   ├── common/               # ScreenHeader · ActionSheet · EmptyState · ErrorState · LoadingState
│   └── map/                  # §13 격리 인터페이스
├── constants/
│   └── tmdb.ts               # ★ 이미지 base URL·사이즈 — 반드시 여기 한 곳 (§7.2)
├── hooks/                    # react-query 래퍼. 화면은 이 계층만 의존
├── navigation/
│   ├── RootNavigator.tsx  AuthNavigator.tsx  MainTabNavigator.tsx
│   ├── stacks/
│   └── types.ts
├── screens/
│   ├── home/  search/  records/  mypage/          ← 1군
│   ├── wishlist/  collection/  report/            ← 2군
│   └── social/  cinemap/  recommend/              ← 3군
├── store/                    # authStore · uiStore (zustand)
├── theme/                    # tokens.ts
└── types/
    ├── api.d.ts              # ★ 생성물. 직접 수정 금지 (§4)
    └── view.ts               # 프론트 전용 뷰모델만
```

**핵심 규칙**
1. 화면은 `api/`를 직접 import하지 않는다. 반드시 `hooks/`를 경유한다.
2. 화면은 색상 리터럴(`#14D9D9`)을 쓰지 않는다. `theme/tokens.ts`만 참조한다.
3. 화면 간 전달은 **엔티티 객체가 아니라 ID**로 한다.
4. `types/api.d.ts`는 생성물이다. 손대면 다음 생성 때 사라진다.

---

## 4. 타입 — 생성이 원칙

`/v3/api-docs`에서 생성한다. **DTO를 손으로 다시 쓰지 않는다** — v1이 그렇게 하다가 필드명이
전부 어긋났다. 5-7 D에서 이미 검증된 경로다(0.8~0.9초, 에러 없음).

```bash
# 백엔드를 로컬에서 띄운 상태로
npx openapi-typescript http://localhost:8080/v3/api-docs -o src/types/api.d.ts
```

`package.json`에 스크립트로 고정한다.

```json
"scripts": { "gen:api": "openapi-typescript http://localhost:8080/v3/api-docs -o src/types/api.d.ts" }
```

**사용 패턴** — 생성 타입에서 필요한 스키마만 별칭으로 꺼내 쓴다.

```ts
// src/types/index.ts
import type { components } from './api';
type S = components['schemas'];

export type MovieListItem   = S['MovieListItemResponse'];
export type MovieDetail     = S['MovieDetailResponse'];
export type MovieSummary    = S['MovieSummaryResponse'];
export type UserMovieItem   = S['UserMovieListItemResponse'];
export type WatchRecord     = S['WatchRecordResponse'];
export type Review          = S['ReviewResponse'];
export type Collection      = S['CollectionResponse'];
export type UserProfile     = S['UserProfileResponse'];
export type TokenResponse   = S['TokenResponse'];
// … 필요한 것만
```

> ⚠️ **`@AuthUser` 누출은 이미 수정됐다.** 5-7 D에서 Springdoc이 `viewerId`/`authorId` 등을
> 공개 쿼리 파라미터로 노출하던 버그를 `addAnnotationsToIgnore(AuthUser.class)`로 고쳤다.
> 생성 타입에 `viewerId` 같은 쿼리 파라미터가 보이면 **백엔드가 되돌아간 것**이니 보고할 것.

### 타입 생성이 안 되는 상황

백엔드를 띄울 수 없을 때는 `src/types/api.d.ts`를 **커밋된 스냅샷**으로 쓴다. 생성물이지만
리포에 커밋해 둔다 — 백엔드 없이도 프론트 빌드가 되어야 하고, 필드 변경이 diff로 드러난다.

---

## 5. 실제 API 표면

> 아래는 백엔드 소스에서 직접 확인한 것이다(2026-08-28). 상세 필드는 생성 타입을 보고,
> 이 표는 **어떤 화면이 어떤 엔드포인트를 쓰는지** 파악하는 용도다.

### 5.1 공통 규약

- Base URL: `EXPO_PUBLIC_API_BASE_URL`. **실기기에서 `localhost`는 폰 자신**이므로 개발 중엔 LAN IP.
- 페이징 응답: `PageResponse<T> { content, page /*0-based*/, size, totalElements, totalPages, first, last }`
- ⚠️ **무한스크롤은 `content.isEmpty()`가 아니라 `last`로 판정한다.** `getMovieReviews`는
  비공개 작성자 리뷰를 조회 후 필터링해서 빼므로 **페이지당 항목 수가 요청 size보다 적을 수 있다.**
- 에러 응답: `{ status, code, message, errors: [{field, reason}] }`
  → `errors[]`를 폼 필드에 매핑해 표시한다.
- 성공 응답 래퍼 없음. HTTP 상태코드가 계약이다. **204는 정상 응답**이다(빈 바디).

### 5.2 영화 · 검색 (permitAll GET)

| 메서드 | 경로 | 응답 | 화면 |
|---|---|---|---|
| GET | `/api/movies` | `PageResponse<MovieListItemResponse>` | (미사용) |
| GET | `/api/movies/search?query=&year=&page=` | `MovieSearchResponse` | search |
| GET | `/api/movies/{movieId}` | `MovieDetailResponse` | search 상세 |
| GET | `/api/movies/{movieId}/cast?page=` | `PageResponse<ActorResponse>` (size 50) | 상세 더보기 |
| POST | `/api/movies/sync` **(인증)** | `{ movieId }` ← body `{ tmdbId }` | search |

**검색 응답이 2섹션인 것이 핵심 설계다.**

```ts
{
  registered:  PageResponse<MovieSummaryResponse>,      // 우리 DB. { id, title, posterPath, releaseDate }
  suggestions: { tmdbId, title, posterPath, releaseDate }[]   // TMDB 미등록분
}
```

- `page`는 **1-based**(다른 페이징과 다르다). 페이지 크기 고정 20.
- `suggestions`는 **`page === 1`일 때만** 채워진다. 2페이지 이후 항상 `[]`.
- `suggestions` 항목에 **`movieId`가 없다는 것이 "미등록"의 신호**다. 플래그가 아니라 구조로 표현된다.
- TMDB 장애 시 예외 없이 `suggestions: []`로 폴백. `registered`는 정상.
- 소스에 개수 slice가 없어 최대 20건이 그대로 온다 → **화면에서 표시 개수를 제한**할 것.

**미등록 영화 선택 플로우 (1군의 핵심 동선)**

```
검색 → suggestions 항목 탭 → POST /api/movies/sync { tmdbId }
     → { movieId } 수신 → MovieDetail(movieId)로 이동
```

`sync`는 **인증 필수**다(미인증이면 임의 tmdbId로 DB를 채우는 통로가 된다).
실패: `TMDB_MOVIE_NOT_FOUND`(404), `ADULT_CONTENT_NOT_ALLOWED`(400).
sync에 시간이 걸리므로 **로딩 상태를 반드시 보여준다.**

### 5.3 시청 기록 · 리뷰 · 위시

| 메서드 | 경로 | 응답 | 비고 |
|---|---|---|---|
| GET | `/api/users/{userId}/records` | `PageResponse<UserMovieListItemResponse>` | 비로그인 조회 가능(공개범위 적용) |
| GET | `/api/users/{userId}/records/movies/{movieId}` | **`List<WatchRecordResponse>`** | 회차 목록. 페이징 없음 |
| POST | `/api/records` | 201 + `Location` | body: `movieId`만 필수 |
| DELETE | `/api/records/{recordId}` | 204 | |
| PATCH | `/api/records/{recordId}/representative` | 204 | 멱등 |
| GET | `/api/movies/{movieId}/reviews` | `PageResponse<ReviewResponse>` | |
| **PUT** | `/api/movies/{movieId}/review` | 200 `ReviewResponse` | **upsert**. POST 아님 |
| DELETE | `/api/movies/{movieId}/review` | 204 | |
| GET | `/api/reviews/me?movieId=` | 200 `ReviewResponse` **또는 204** | **204 = 리뷰 없음(정상)** |
| GET | `/api/users/{userId}/wishes` | `PageResponse<WishListItemResponse>` | |
| **POST** | `/api/movies/{movieId}/wish` | 200 `{ wished }` | **토글 단일 엔드포인트** |
| GET | `/api/wishes/me/{movieId}` | 200 `{ wished }` | 인증 필수 |

⚠️ **`watch_record`와 `review`는 다른 리소스다.** 와이어프레임은 하나로 뭉쳐 놨다.

| | `watch_record` | `review` |
|---|---|---|
| 성격 | 개인 시청 기록, **회차별 여러 개** | 공개 대표 리뷰, **영화당 정확히 1개** |
| `watchDate` | **nullable** (오래돼 기억 안 나는 경우 허용) | 없음 |
| `rating` | nullable, 0.0~10.0 | **not null**, 0.0~10.0 |
| 본문 | `note` (개인 메모) | `content` (공개, max 2000) |
| 작성 조건 | 시청 사실이 곧 기록 | **시청 기록 없이도 작성 가능** |

→ 화면에서도 **"기록 남기기"와 "리뷰 쓰기"를 분리**한다. 한 폼에 섞으면 회차 개념과
영화당 1개 제약이 충돌한다.

⚠️ `watchType === 'OTT'`면 `ottPlatformId` **필수**, `THEATER`/`ETC`/`null`이면 **있으면 안 된다**.
위반 시 `INVALID_WATCH_TYPE_OTT_COMBINATION`(400).

### 5.4 컬렉션 · 소셜

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/api/users/{userId}/collections` | `PageResponse<CollectionResponse>` |
| GET | `/api/collections/{id}/movies` | `PageResponse<CollectionMovieListItemResponse>` |
| POST | `/api/collections` | 201 + `Location` |
| PATCH | `/api/collections/{id}` | 200 |
| DELETE | `/api/collections/{id}` | 204 |
| POST | `/api/collections/{id}/movies` | 200 `{ addedCount, skippedCount }` — 벌크·멱등, 최대 50 |
| DELETE | `/api/collections/{id}/movies/{movieId}` | 204 |
| POST·DELETE | `/api/users/{userId}/follow` | 204, 멱등 |
| GET | `/api/users/{userId}/followers` · `/followings` | `PageResponse<FollowUserResponse>` |
| GET | `/api/comments?targetType=&targetId=` | `PageResponse<CommentResponse>` |
| POST | `/api/comments` | 201 + `Location` |
| PATCH·DELETE | `/api/comments/{id}` | **204 (바디 없음)** |

⚠️ **컬렉션 단건 조회 엔드포인트가 없다** (잔여 #4). 상세 화면은 목록에서 받은
`CollectionResponse` + `getCollectionMovies`로 구성한다. **딥링크로 컬렉션 상세에 바로
진입하면 제목·설명을 가져올 방법이 없다** → 딥링크가 필요하면 백엔드에 요청할 것.

⚠️ `TargetType` enum은 `COLLECTION` | `REVIEW`다 (`CommentTargetType`이 아니다).

### 5.5 사용자 · 극장 · 박스오피스

| 메서드 | 경로 | 응답 | 비고 |
|---|---|---|---|
| GET | `/api/users/{userId}/profile` | `UserProfileResponse` | permitAll. **비공개 계정도 프로필은 노출** |
| GET | `/api/users/me` | `UserResponse` | |
| PATCH | `/api/users/me/nickname` · `/privacy` | 200 `UserResponse` | 닉네임 max **30** |
| PATCH | `/api/users/me/password` | **204** | ⚠️ **성공 시 전 세션 폐기 → 재로그인 화면으로 보낼 것** |
| GET | `/api/theaters/nearby?latitude=&longitude=&radiusMeters=&limit=` | `List<TheaterResponse>` | ⚠️ **테이블 비어 있음** |
| GET | `/api/box-office?rankType=&targetDate=` | `BoxOfficeResponse` | `rankType`: `DAILY`\|`WEEKLY`\|`WEEKEND` |

⚠️ `BoxOfficeItemResponse.posterPath`·`movieId`는 **`movie` 매칭에 성공한 항목만 채워진다**
(`linked: boolean`으로 구분). 미매칭이면 `movieTitle`만 있다. 현재 매칭률 90.7%.
**포스터 없는 항목의 폴백을 반드시 준비**할 것.

### 5.6 enum

| enum | 값 |
|---|---|
| `PrivacySetting` | `PRIVATE` · `FRIENDS`(상호 팔로우) · `PUBLIC` |
| `WatchType` | `THEATER` · `OTT` · `ETC` |
| `RankType` | `DAILY` · `WEEKLY` · `WEEKEND` |
| `TargetType` | `COLLECTION` · `REVIEW` |
| `RoleTier` | `LEAD` · `SUPPORTING` · `MINOR` · `EXTRA` |
| `OAuthProvider` | `KAKAO` |

---

## 6. 인증 설계 — M2에서 가장 조심할 부분

와이어프레임에 인증 화면이 전혀 없으나 백엔드는 **이미 완비**돼 있다. 그리고 이 백엔드는
**리프레시 토큰 회전 + 재사용 감지**를 구현하고 있어, 클라이언트를 잘못 짜면
**사용자가 이유 없이 로그아웃되는** 증상이 난다.

### 6.1 엔드포인트

| # | 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|---|
| 1 | POST | `/api/auth/signup` | `{ email, rawPassword, nickname }` | **201** `UserResponse` |
| 2 | POST | `/api/auth/login` | `{ email, password }` | 200 `TokenResponse` |
| 3 | POST | `/api/auth/nonce` | 없음 | 200 `{ nonce, expiresIn }` |
| 4 | POST | `/api/auth/oauth/{provider}` | `{ idToken, nonce }` | 200 `TokenResponse` |
| 5 | POST | `/api/auth/reissue` | `{ refreshToken }` | 200 `TokenResponse` |
| 6 | POST | `/api/auth/logout` **(인증)** | `{ refreshToken }` | **204** |
| 7 | POST | `/api/auth/password-reset/request` | `{ email }` | **200 (항상)** |
| 8 | POST | `/api/auth/password-reset/verify` | `{ token }` | 200 |
| 9 | POST | `/api/auth/password-reset/confirm` | `{ token, newPassword }` | **204** |

```ts
TokenResponse { accessToken: string; refreshToken: string; accessTokenExpiresIn: number /* 초, 기본 1800 */ }
```

> ⚠️ **회원가입 요청 필드는 `password`가 아니라 `rawPassword`다.** 로그인은 `password`다.
> 두 DTO의 필드명이 다르니 복붙하지 말 것.

### 6.2 토큰 정책 (백엔드 확정 사항)

| 항목 | 값 |
|---|---|
| access token | JWT, TTL **30분** |
| refresh token | **JWT 아님.** 256bit Base64URL 불투명 랜덤 43자. **디코드 시도 금지** |
| refresh TTL | **14일** |
| **회전** | `reissue` 할 때마다 refreshToken도 **새로 발급되고 기존 것은 즉시 폐기** |
| **재사용 감지** | 폐기된 refresh 재전송 → `REFRESH_TOKEN_REUSED`(401) + **해당 유저 전 세션 폐기** |
| 로그아웃 | refresh만 폐기. **accessToken은 무효화되지 않는다**(최대 30분 잔존) |
| 비밀번호 변경/재설정 | 전 세션 폐기 → **재로그인 필수**. 재설정은 토큰을 발급하지 않는다 |

### 6.3 ⚠️ 401 인터셉터 — 동시 요청을 반드시 하나로 묶어라

**이 프로젝트에서 가장 터지기 쉬운 지점이다.**

화면 진입 시 react-query가 병렬로 3~4개를 호출하는 일이 흔하다. access token이 만료된
순간이면 **그 요청들이 동시에 401을 받는다.** 각자 `reissue`를 호출하면:

```
요청A 401 → reissue(RT1) → RT2 발급, RT1 폐기 ✅
요청B 401 → reissue(RT1) → RT1은 이미 폐기됨 → REFRESH_TOKEN_REUSED
                        → 백엔드가 이 유저의 전 세션을 폐기
                        → 방금 받은 RT2까지 죽는다 → 강제 로그아웃 💥
```

**증상은 "가끔 앱이 혼자 로그아웃된다"이고, 재현이 어렵다.** 반드시 아래 구조로 짠다.

```ts
// src/api/client.ts (설계 골자)
let refreshPromise: Promise<string> | null = null;   // ★ 단일 비행(single-flight)

async function refreshOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doReissue().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;            // 동시 401은 전부 같은 Promise를 기다린다
}
```

**인터셉터 규칙**

1. 401 수신 → `refreshOnce()`를 await → 새 accessToken으로 **원 요청 1회만** 재시도
2. 재시도한 요청에 재시도 플래그를 달아 **무한 루프를 막는다**
3. `reissue` 응답의 **refreshToken을 반드시 저장**한다(회전되므로 이전 것은 죽었다)
4. `reissue` 자체가 401이면 **즉시 로그아웃** — 재시도하지 않는다
5. **`/api/auth/**` 요청은 인터셉터 대상에서 제외**한다 (로그인 실패가 refresh를 유발하면 안 됨)

**에러 코드별 분기**

| `code` | 처리 |
|---|---|
| `TOKEN_EXPIRED` | `refreshOnce()` 후 재시도 |
| `INVALID_TOKEN` · `REFRESH_TOKEN_NOT_FOUND` · `REFRESH_TOKEN_REUSED` | **즉시 로그아웃** |
| `INVALID_CREDENTIALS` | 로그인 폼에 표시 (인터셉터 개입 없음) |
| `INVALID_NONCE` | nonce 재발급 후 카카오 로그인 재시도 |
| `INVALID_OAUTH_TOKEN` | §6.5 참고 |

### 6.4 저장과 부팅 시퀀스

- `accessToken` / `refreshToken` 모두 **`expo-secure-store`**. `AsyncStorage`에 두지 않는다.
- **부팅 시 SecureStore를 읽는 동안 SplashScreen을 유지**한다(`expo-splash-screen`의
  `preventAutoHideAsync`). 빠뜨리면 앱 실행마다 로그인 화면이 한 번 깜빡였다가 메인으로 넘어간다.
- `authStore`(zustand)가 `status: 'loading' | 'authenticated' | 'anonymous'` 3상태를 갖고,
  `RootNavigator`가 이 값으로 분기한다. **화면에서 수동으로 `navigate`하지 않는다** —
  로그인 성공 시 `setAuth()`만 호출하면 네비게이터가 알아서 바뀐다.

### 6.5 카카오 로그인 — M2에서 처음 붙는다

```
POST /api/auth/nonce → { nonce, expiresIn: 300 }
  → 카카오 SDK 로그인 (nonce 전달)
  → POST /api/auth/oauth/kakao { idToken, nonce } → TokenResponse
```

- nonce TTL **5분**, **1회용**. 로그인 화면 진입 시가 아니라 **버튼 탭 시점에 발급**할 것.
- ⚠️ **백엔드에 한 줄 추가가 필요하다.** 로컬 검증을 통과한 `aud`는 **REST API 키**다.
  RN에서 카카오 SDK로 로그인하면 `aud`가 **네이티브 앱 키**로 바뀌어 **똑같은
  `INVALID_OAUTH_TOKEN`을 만난다.** `oauth.kakao.allowed-audiences`가 목록이므로
  **교체가 아니라 추가**다. 기획노트 4-M2에 이미 예고된 항목이다.
- ⚠️ **검증용으로 늘려둔 `auth.oauth.nonce-ttl`을 `PT5M`으로 되돌릴 것** (기획노트 지적사항).
- ⚠️ **카카오 로그인을 실기기에 붙이는 시점이 곧 실서버 배포 트리거다**(기획노트 4-INF).
  실기기에서 `localhost`는 폰 자신이고, 카카오는 등록된 redirect URI만 허용해 LAN IP 우회가
  안 된다. 대략 9월 중순.

### 6.6 화면

**Login** — 로고(홈 화면 타이포 재사용) / 이메일 / 비밀번호 / `로그인` / `카카오로 시작하기` /
`회원가입` · `비밀번호 찾기` 링크
**SignUp** — 이메일 / 비밀번호(8~64자) / 비밀번호 확인 / 닉네임(max 50) / `가입하기`
**PasswordReset** — 이메일 입력 → 안내 → (메일 링크) → 새 비밀번호 → **로그인 화면으로**

- `react-hook-form` + `zod`. 서버 `errors[]`를 필드에 매핑.
- ⚠️ 가입 닉네임은 max **50**, 변경 API는 max **30**이다. 비대칭이니 각각 맞춘다.
- `password-reset/request`는 **이메일 존재 여부와 무관하게 항상 200**이다(계정 열거 방지).
  화면도 "메일을 보냈습니다"로 동일하게 응답할 것 — 여기서 분기하면 백엔드 방어가 무의미해진다.

---

## 7. 디자인 토큰 · 이미지 · 별점

### 7.1 토큰

`cinemory-wireframe/src/styles/theme.css`의 `:root` 이식. 브랜드 컬러는 기획노트 7절과 일치한다.

```ts
// src/theme/tokens.ts
export const colors = {
  background: '#FFFFFF',  foreground: '#252525',  card: '#FFFFFF',
  primary: '#14D9D9',     primaryForeground: '#FFFFFF',      // 브랜드 시안
  brandDeep: '#37BEB0',   brandLight: '#DBF5F0',             // 기획노트 7절 로고 아웃라인
  muted: '#ECECF0',       mutedForeground: '#717182',
  accent: '#E9EBEF',      destructive: '#D4183D',
  border: 'rgba(0,0,0,0.1)', inputBackground: '#F3F3F5',
  star: '#FACC15',
} as const;

export const radius  = { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 } as const;  // --radius 0.625rem = 10
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const layout  = { tabBarHeight: 64, posterAspectRatio: 2 / 3, screenPadding: 16 } as const;

export const posterFallbackPalette = [
  '#4A90E2','#7B68EE','#FF69B4','#FFD700','#FF6347','#32CD32','#9370DB','#FF8C00',
] as const;
```

### 7.2 ★ TMDB 이미지 — 상수 한 곳

백엔드는 **TMDB 경로 문자열만 그대로 저장**한다. `posterPath`는 `/abc123.jpg` 형태(**선행
슬래시 포함**). base URL 조립은 **의도적으로 프론트 몫**이다(기획노트 4-M2, tmdb-sync 6-3).

```ts
// src/constants/tmdb.ts  ← 이 파일 밖에서 URL을 조립하지 않는다
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const PosterSize = { LIST: 'w185', DETAIL: 'w500' } as const;   // 기획노트 지정
export const ProfileSize = { LIST: 'w185' } as const;
export const BackdropSize = { DETAIL: 'w780' } as const;               // 미지정 — 우리가 정함

export function tmdbImageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;   // path가 '/'로 시작하므로 사이에 슬래시 금지
}
```

- **화면마다 문자열을 조립하면 정책 변경 때 전부 찾아다녀야 한다**(기획노트 경고).
- `posterPath` · `backdropPath` · `profilePath` 모두 **nullable**이다. `backdropPath`는 특히
  자주 비어 있다 → `PosterImage` 컴포넌트가 `posterFallbackPalette[movieId % 8]` 그라데이션으로
  폴백한다. **색상은 `movieId` 기반 결정론적**이어야 재렌더 시 깜빡이지 않는다.
- ⚠️ **TMDB 출처 표기(attribution) 요건 확인 필요** — 기획노트가 남겨둔 항목.
  마이페이지나 설정에 표기 위치를 잡을 것.

### 7.3 ★ 별점 — 0.0~10.0이다

와이어프레임은 별 5개 UI인데 **백엔드는 `Double` 0.0~10.0**이다. `review.rating`은 not null,
`watch_record.rating`은 nullable이며 **둘 다 같은 0~10 척도**다.

**권장: 별 5개 + 반개 단위 → 저장 시 ×2**

```
UI 0.5 ~ 5.0 (0.5 단위)  ⇄  API 1.0 ~ 10.0 (1.0 단위)
표시: apiRating / 2      저장: uiRating * 2
```

- 변환 함수를 `src/utils/rating.ts` 한 곳에 두고 화면에서 직접 곱하지 않는다.
- ⚠️ **범위 위반은 `@Valid`가 아니라 엔티티 `IllegalArgumentException` 경로로 나간다.**
  응답 `code`가 `INVALID_INPUT_VALUE`가 아니므로, 폼 에러 매핑에서 이 케이스가 누락되기 쉽다.
  → 클라이언트에서 범위를 먼저 막는다.

### 7.4 영화 상세의 평점 — ⚠️ 현재 API로는 불가능

`MovieDetailResponse`에 **평점 필드가 하나도 없다**. `Movie` 엔티티에는 `voteAverage`/`voteCount`가
있지만 DTO로 노출되지 않고, 우리 평점(`AVG(review.rating)`) 집계 쿼리도 `ReviewRepository`에 없다.

→ **백엔드 선행 작업이다** (tmdb-sync 잔여 #24, 처리 시점이 "프론트 상세 화면 구현 시"로
지정돼 있다). §11 참고. 그때까지 상세 화면의 평점 영역은 **자리만 잡아두고 숨긴다.**

---

## 8. 네비게이션

### 8.1 와이어프레임의 문제

모든 화면 전환이 부모의 불린 state다.

```tsx
// MyPageScreen.tsx — 현재
if (showMyMovies)    return <MyMoviesScreen onBack={...} />;
if (showCollections) return <CollectionListScreen onBack={...} />;
if (showCalendar)    return <CalendarScreen onBack={...} />;
if (showStatistics)  return <StatisticsScreen onBack={...} />;
```

`MyPageScreen` 하나가 4개 화면의 렌더링 책임을 지고, 백스택·안드로이드 뒤로가기·파라미터가
전부 없다. **이 평탄화가 M2-A의 핵심 작업이다.**

### 8.2 목표 구조

```
RootNavigator (status에 따라 분기, headerShown: false)
├── [loading]        SplashScreen 유지
├── [anonymous]      AuthNavigator
│   └── Login · SignUp · PasswordResetRequest · PasswordResetConfirm
└── [authenticated]  MainTabNavigator (BottomTabs 5개)
    ├── HomeStack       Home → SearchResult → MovieDetail
    ├── RecommendStack  Recommendation(3군, 플레이스홀더) → MovieDetail
    ├── CineMapStack    CineMap(3군, 플레이스홀더)
    ├── SocialStack     Social(3군, 플레이스홀더) → MovieDetail · CollectionDetail
    └── MyPageStack     MyPage → MyRecords → MovieDetail
                             → Wishlist → MovieDetail
                             → CollectionList → CollectionDetail → MovieDetail
                             → Report(2군) · EditProfile · Settings
```

> **3군 탭은 M2-A에서 플레이스홀더 화면으로 만들어 둔다.** 탭이 5개인 것은 와이어프레임의
> 확정 사항이고, 빈 탭이라도 네비게이션 골격은 먼저 끝까지 돌아가야 한다.
> 플레이스홀더에는 "준비 중" `EmptyState`를 넣는다.

### 8.3 ParamList

```ts
// src/navigation/types.ts
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  PasswordResetRequest: undefined;
  PasswordResetConfirm: { token: string };     // 메일 딥링크로 진입
};

export type MainTabParamList = {
  HomeTab:      NavigatorScreenParams<HomeStackParamList>;
  RecommendTab: NavigatorScreenParams<RecommendStackParamList>;
  CineMapTab:   NavigatorScreenParams<CineMapStackParamList>;
  SocialTab:    NavigatorScreenParams<SocialStackParamList>;
  MyPageTab:    NavigatorScreenParams<MyPageStackParamList>;
};

export type HomeStackParamList = {
  Home: undefined;
  SearchResult: { query: string };
  MovieDetail: { movieId: number };            // ★ 객체가 아니라 ID
};

export type MyPageStackParamList = {
  MyPage: undefined;
  EditProfile: undefined;
  Settings: undefined;
  MyRecords: undefined;
  Wishlist: undefined;
  CollectionList: undefined;
  CollectionDetail: { collectionId: number; title: string };  // ⚠️ 단건 조회 API 부재 → title 동반 전달
  Report: undefined;                            // 2군
  MovieDetail: { movieId: number };
};
// RecommendStack · CineMapStack · SocialStack도 동일 패턴
```

> ⚠️ **`CollectionDetail`만 예외적으로 `title`을 함께 받는다.** 컬렉션 단건 조회 API가
> 없어서(잔여 #4) 목록에서 받은 값을 넘겨야 헤더를 그릴 수 있다. **딥링크로 이 화면에
> 직접 진입하는 기능이 필요해지면 백엔드에 `getCollection`을 요청**해야 한다 —
> 그 전까지 딥링크 대상에서 제외한다.

### 8.4 탭

| key | label | icon (lucide) | 상태 |
|---|---|---|---|
| `HomeTab` | 홈 | `Home` | 1군 |
| `RecommendTab` | 추천 | `Film` | 3군 (플레이스홀더) |
| `CineMapTab` | CineMap | `Map` | 3군 (플레이스홀더) |
| `SocialTab` | 소셜 | `Users` | 3군 (플레이스홀더) |
| `MyPageTab` | 마이페이지 | `User` | 1군 |

- 활성 `tintColor` `colors.primary`, 비활성 `colors.mutedForeground`
- 높이 64 + `useSafeAreaInsets().bottom`
- ⚠️ **와이어프레임의 `pb-20`을 전부 제거한다.** 웹에서 `fixed` 탭바를 피하려 각 화면이 직접
  넣은 하단 패딩이다. RN에서는 탭 네비게이터가 콘텐츠 영역을 자동 계산하므로 그대로 옮기면
  하단에 80px 빈 공간이 생긴다.

### 8.5 헤더

**네이티브 헤더를 쓴다.** 안드로이드 하드웨어 뒤로가기와 iOS 스와이프 백이 공짜로 따라온다.

```tsx
<Stack.Screen name="MyRecords" component={MyRecordsScreen}
  options={{ headerShown: true, title: '내 기록' }} />
```

예외 2개: `MovieDetail`(`headerTransparent: true` — 포스터 위 투명 헤더),
`Home`(`headerShown: false`).

---

## 9. 화면별 스펙

### 9.0 전 화면 공통

1. `div`→`View`, `h1~h4`/`p`/`span`→`Txt`(프리미티브), `button`→`Pressable`
2. **엔티티가 아니라 ID를 넘긴다.** 와이어프레임은 `<MovieDetailScreen movie={selectedMovie} />`로
   객체를 통째로 넘기고, `CollectionDetailScreen`은 없는 필드를 `genre:'드라마', rating:8.5,
   year:2020`으로 **지어낸다.** RN에서는 `navigate('MovieDetail', { movieId })` 후 화면이
   `useMovieDetail(movieId)`로 직접 조회한다.
3. **모든 목록이 4-상태를 처리한다**: 로딩(스켈레톤) / 에러(재시도) / 빈 목록(안내+CTA) /
   정상. 와이어프레임엔 셋 다 없다.
4. `ScrollView` + `.map()` 대신 **`FlatList`**.
5. 무한스크롤은 **`last` 필드로 판정**한다(§5.1).
6. `Math.random()`으로 데이터를 만드는 와이어프레임 코드는 전부 제거한다.

---

### 【1군】 9월

#### 9.1 HomeScreen

- 배경: 4열 포스터 그리드 60초 상향 루프 → `react-native-reanimated`
  `withRepeat(withTiming(-h, { duration: 60000, easing: Easing.linear }), -1)`.
  성능 이슈 시 정적 그리드로 대체 가능(우선순위 낮음).
- 로고 `fontSize: 56, fontWeight: '700', color: colors.primary`. 와이어프레임의 4방향
  `textShadow` 아웃라인은 RN이 단일 그림자만 지원 → 동일 텍스트 4회 오프셋 렌더 또는 단순화.
- 검색: `TextInput` + `returnKeyType="search"` + `onSubmitEditing`
  → `navigate('SearchResult', { query })`. `showSearchResult` 불린 state 제거.
- 배경 포스터는 `GET /api/box-office`(DAILY)의 `posterPath`로 채울 수 있다.
  **`linked === false`인 항목은 `posterPath`가 null**이므로 폴백 필요.

#### 9.2 SearchResultScreen ★ 2섹션 구조가 핵심

와이어프레임은 단일 리스트지만 **실제 응답은 `registered` + `suggestions` 2섹션**이다.
이걸 하나로 합치면 안 된다 — `suggestions`는 `movieId`가 없어서 탭 동작이 다르다.

```
SectionList
├─ [내 서재에 있는 작품]  registered   → 탭 시 navigate('MovieDetail', { movieId: item.id })
└─ [더 찾아보기]          suggestions  → 탭 시 sync 후 이동 (아래)
```

**suggestions 탭 동작**

```
1. 로딩 오버레이 표시 ("작품 정보를 가져오는 중")
2. POST /api/movies/sync { tmdbId }
3. { movieId } 수신 → navigate('MovieDetail', { movieId })
4. queryClient.invalidateQueries(['movies','search'])   // 다음 검색 때 registered로 이동
```

- `sync`는 **인증 필수**다. 비로그인 상태에서 suggestions를 탭하면 로그인 유도.
- 실패: `TMDB_MOVIE_NOT_FOUND`(404) / `ADULT_CONTENT_NOT_ALLOWED`(400) → 토스트
- `suggestions`는 **page 1에서만** 온다. 무한스크롤 2페이지부터는 `registered`만 이어붙인다.
- 소스에 개수 제한이 없어 최대 20건이 그대로 오므로 **화면에서 5~10건으로 자른다.**
- `page`가 **1-based**임에 주의(`useInfiniteQuery`의 `initialPageParam: 1`).

#### 9.3 MovieDetailScreen ★ M2 핵심 화면

**레이아웃** (와이어프레임 유지)
1. 히어로 256 — `backdropPath` 있으면 이미지, 없으면 포스터 폴백 그라데이션
2. 포스터 카드 112×160 + 제목 + `{releaseDate 연도} · {runtime}분`
3. 정보 카드 — 장르 / 국가 / 감독 / 출연(상위 20명, 더보기는 `/cast`)
4. 줄거리(`overview`)
5. **내 기록 카드**
6. 리뷰 섹션

**⚠️ 상세 화면은 API 호출이 여러 개다.** `MovieDetailResponse`에 내 기록·찜·평점이 없다.

| 데이터 | 엔드포인트 | 조건 |
|---|---|---|
| 영화 정보 | `GET /api/movies/{movieId}` | 항상 |
| 내 시청 기록(회차) | `GET /api/users/{myId}/records/movies/{movieId}` | 로그인 시 |
| 내 리뷰 | `GET /api/reviews/me?movieId=` | 로그인 시. **204면 리뷰 없음(정상)** |
| 찜 여부 | `GET /api/wishes/me/{movieId}` | 로그인 시 |
| 공개 리뷰 목록 | `GET /api/movies/{movieId}/reviews` | 항상 |
| 평점 | **없음** | §11 백엔드 선행 |

→ `useMovieDetailBundle(movieId)` 훅으로 묶고, 로그인 여부에 따라 `enabled`를 제어한다.

**내 기록 — 와이어프레임과 다르게 3개로 분리한다**

와이어프레임은 `isWatched`/`watchDate`/`userRating`/`isInCollection` 4개 로컬 state와
핸들러 없는 `저장하기` 버튼 하나다. 실제로는 성격이 다른 3개 액션이다.

| 액션 | 저장 시점 | API |
|---|---|---|
| **찜** (`Heart`) | **즉시**, 낙관적 업데이트 | `POST /api/movies/{id}/wish` (토글) |
| **컬렉션에 추가** | 즉시 (컬렉션 선택 시트) | `POST /api/collections/{id}/movies` |
| **시청 기록 남기기** | 별도 모달 → 저장 | `POST /api/records` |
| **리뷰 쓰기** | 별도 모달 → 저장 | `PUT /api/movies/{id}/review` (upsert) |

- **기록과 리뷰를 한 폼에 섞지 않는다.** 기록은 회차별 여러 개, 리뷰는 영화당 1개다.
- 기록 모달 필드: `watchDate`(**선택** — "기억 안 남" 허용), `watchType`, `ottPlatformId`
  (watchType이 OTT일 때만·필수), `placeDetail`, `rating`(선택), `note`
- 회차가 2개 이상이면 목록으로 보여주고 `PATCH .../representative`로 대표 지정
- 컬렉션 추가는 불린 토글이 아니라 **어느 컬렉션인지 고르는 시트**여야 한다
- 날짜: `<input type="date">` → `@react-native-community/datetimepicker`
  (Android `DateTimePickerAndroid.open()` / iOS 인라인 — 플랫폼 분기)
- 별점: 별 5개 반개 단위, 저장 시 ×2 (§7.3). **같은 별 재탭 시 해제** 가능하게 할 것
- 저장 성공 시 `invalidateQueries`: 내 기록 · 내 리뷰 · `records` 목록

#### 9.4 MyRecordsScreen (와이어프레임 `MyMoviesScreen`의 시청 탭)

- `GET /api/users/{myId}/records` → `PageResponse<UserMovieListItemResponse>`
- 그리드(3열) ↔ 리스트 토글
- ⚠️ **와이어프레임의 정렬·별점 필터는 서버가 지원하지 않는다.** `sortOption`/`ratingFilter`
  state가 선언만 되고 목록에 반영되지 않는 것도 와이어프레임의 미구현 부분이다.
  **5-0-D에서 클라이언트 `sort` 파라미터를 의도적으로 지원하지 않기로 확정**했으므로
  (인덱스를 타지 않는 정렬이 조용히 만들어지는 것을 막기 위함), M2에서는 **정렬·필터 UI를
  넣지 않는다.** 필요해지면 백엔드에 정렬 옵션을 요청한다.
- 와이어프레임의 시청/찜 2탭 구조는 **찜을 별도 화면(`Wishlist`, 2군)으로 분리**한다 —
  엔드포인트가 다르고 응답 DTO도 다르다.
- 스크롤 시 헤더 숨김(DOM `scrollTop` 델타 측정)은 **M2에서 생략**한다. 필터 바를 없앴으므로
  숨길 헤더도 없다.

#### 9.5 MyPageScreen

- 커버(128, primary 그라데이션) + 프로필 이미지(96) + 닉네임 + 통계
- ⚠️ 와이어프레임의 `<h2>User</h2>`, `영화 135편 관람`은 하드코딩 → `GET /api/users/me`
- ⚠️ **`UserProfileResponse`에 `watchedCount`가 없다.** 팔로워/팔로잉 수만 있다.
  "N편 관람"을 보여주려면 `GET /api/users/{me}/records`의 `totalElements`를 쓴다
  (size=1로 요청해 개수만 받는다).
- 메뉴: 내 기록 · 내 컬렉션 · 찜 목록 · 시청 분석(2군) · 프로필 수정 · 설정
- **설정 화면에 로그아웃 + 비밀번호 변경 + 공개범위 설정**을 넣는다 (와이어프레임에 없음)
- ⚠️ **비밀번호 변경 성공(204) 시 저장된 토큰을 폐기하고 로그인 화면으로 보낸다.**
  서버가 전 세션을 끊었으므로 다음 재발급이 반드시 실패한다. 5-1에 "프론트 과제"로 명시된 계약이다.
- ⚠️ **프로필 사진 업로드는 M2에서 만들지 않는다.** `user.profile_image` 저장 위치가 미결이고
  (security-spec L-13), **되돌리기가 가장 비싼 결정**이다. 기획노트가 "기능을 만들기 전에
  정할 것"으로 못박았다. 그때까지 카카오 프로필 URL만 표시한다.

---

### 【2군】 10월

#### 9.6 WishlistScreen
`GET /api/users/{myId}/wishes` → `PageResponse<WishListItemResponse>`. 그리드/리스트 토글.
항목 탭 → `MovieDetail`. 빈 목록 시 검색 유도 CTA.

#### 9.7 CollectionList / CollectionDetail

**List** — 카드 = 상단 포스터 스트립(최대 5, 부족분 빈 슬롯) + 제목/편수.
`GET /api/users/{myId}/collections`.
⚠️ **`CollectionResponse`에 포스터 목록이 없다** (`{id, name, description, movieCount, createdAt, updatedAt}`).
포스터 스트립을 그리려면 컬렉션마다 `getCollectionMovies`를 호출해야 한다 → **N+1 요청**.
M2에서는 **포스터 스트립 없이 이름 + 편수만** 표시하고, 필요해지면 백엔드에 미리보기 포스터
필드를 요청한다.

**Detail** — 헤더는 목록에서 넘긴 `title` 사용(§8.3). `getCollectionMovies`로 목록.
그리드/리스트 토글. `MoreVertical` → ActionSheet(수정/삭제). 삭제는 `Alert.alert` 확인 필수.
영화 추가는 `POST /api/collections/{id}/movies` **벌크·멱등**(최대 50) → `{addedCount, skippedCount}`를
토스트로 알린다.

#### 9.8 ReportScreen — ⚠️ 백엔드 미구현

통계·캘린더·월말 리포트는 **M3-a**다. 설계(가중치 공식·집계 쿼리)는 기획노트 2-4절에 완료돼
있으나 **API가 없다.** §11 참고. M2에서는 화면을 만들지 않고, 2군 진입 시점에 백엔드
M3-a와 함께 진행한다.

와이어프레임의 `StatisticsScreen`·`MonthlyReportScreen`·`CalendarScreen`이 여기 해당한다.
차트는 `react-native-gifted-charts`(`BarChart` 별점 분포 / `PieChart` 평점 분포).
`CalendarView`는 `compact` prop을 유지해 마이페이지 요약과 상세가 공용한다.
⚠️ 와이어프레임이 초기 월을 `new Date(2026, 4, 1)`로 하드코딩한 것을 오늘 날짜로 바꿀 것.

---

### 【3군】 여유 시 — 전부 플레이스홀더로 시작

#### 9.9 SocialScreen — ⚠️ 활동 피드 API가 없다
#### 9.10 CineMapScreen — ⚠️ `theater` 테이블이 비어 있다
#### 9.11 RecommendationScreen — ⚠️ M3-b 설계 백지

셋 다 §11 참고. M2-A에서 **"준비 중" `EmptyState` 플레이스홀더**로 만들어 탭 골격만 완성한다.
CineMap 지도 구현 설계는 §13에 보존해 둔다.

---

## 10. 웹 → RN 변환 규칙표

| 와이어프레임 | RN 대응 | 비고 |
|---|---|---|
| `hover:*` | 제거 | `Pressable`의 `pressed` 상태로 대체 |
| `transition-*` | `Animated` / `LayoutAnimation` | CSS 트랜지션 없음 |
| `fixed`, `sticky` | 네비게이터가 처리 | 탭바·헤더를 네비게이션 계층으로 이동 |
| **`pb-20`** | **삭제** | 탭 네비게이터가 자동 계산 |
| `shadow-lg`, `shadow-md` | iOS `shadow*` / Android `elevation` | 플랫폼 분기 |
| `blur-[2px]`, `backdrop-blur-sm` | `expo-blur` 또는 opacity로 단순화 | |
| `line-clamp-2` | `<Text numberOfLines={2}>` | |
| `aspect-[2/3]` | `style={{ aspectRatio: 2/3 }}` | RN 지원 |
| `overflow-x-auto` | `<ScrollView horizontal>` | |
| `linear-gradient(...)` | `expo-linear-gradient` | 포스터 폴백·히어로·커버 |
| `<input type="date">` | `@react-native-community/datetimepicker` | |
| `<input type="text">` | `<TextInput>` | |
| `absolute` 드롭다운 | `Modal` 기반 ActionSheet | 화면 밖 잘림 문제 없음 |
| `recharts` | `react-native-gifted-charts` | 2군 |
| `lucide-react` | `lucide-react-native` | 아이콘명 동일 |
| `title="..."` 툴팁 | 제거 또는 롱프레스 | |
| `@keyframes` | `react-native-reanimated` | 홈 배경 |
| `Math.random()` 목 데이터 | **전부 제거** | |

> `SocialScreen`의 `ml-13`(=52px)은 아바타 40 + gap 12 만큼 본문을 정렬하려는 의도다.
> Tailwind v4 동적 spacing이라 웹에서는 유효하지만, 모바일 폭(360~430)에서 52px을 빼면
> 리뷰 본문이 지나치게 좁아진다. **RN에서는 들여쓰기를 제거하고 카드 전체 폭을 쓴다.**

### 설치 대상

```bash
npx expo install react-native-webview expo-linear-gradient expo-secure-store \
  expo-splash-screen expo-location expo-asset expo-blur react-native-svg \
  @react-native-community/datetimepicker react-native-reanimated
npm i @tanstack/react-query axios zustand date-fns lucide-react-native \
  react-hook-form zod @hookform/resolvers
npm i -D openapi-typescript
# 2군 진입 시
npm i react-native-gifted-charts
# 스타일링 (택1) — 설치 후 빌드 통과를 먼저 확인
npm i nativewind && npm i -D tailwindcss
```

> ⚠️ Expo SDK 56 / RN 0.85 / React 19.2는 최신이다. **`npx expo install`로 SDK 호환 버전이
> 선택되게** 하고 `npx expo-doctor`로 검증한다. `AGENTS.md` 지침대로
> https://docs.expo.dev/versions/v56.0.0/ 를 확인한 뒤 코드를 작성한다.

---

## 11. ⚠️ 백엔드 선행 필요 항목

**M2 화면 구현을 실제로 막는 것들이다.** 기획노트의 화면 우선순위가 왜 그렇게 정해졌는지가
여기서 설명된다 — 3군은 취향 문제가 아니라 **백엔드가 없어서** 뒤로 간 것이다.

| # | 막히는 것 | 상태 | 필요한 작업 | 우선순위 |
|---|---|---|---|---|
| **B-1** | **카카오 네이티브 앱 키 `aud`** | 설정값 추가는 완료. **검증은 Dev Client 필요** | §11.1 절차 참고 — **prebuild에 묶여 있다** | **M2-B 후반** |
| ~~B-2~~ | ~~`auth.oauth.nonce-ttl`~~ | ✅ **이미 `PT5M`** (`application.yml:73`, 오버라이드 없음) | 없음 | — |
| ~~B-3~~ | ~~CORS Expo origin~~ | ✅ **이미 등록됨** (`8081`, `19006`). **RN 네이티브는 CORS와 무관** — Expo 웹에서만 의미 | 없음 | — |
| **B-4** | **영화 상세 평점** | `MovieDetailResponse`에 필드 없음 | ① `voteAverage`/`voteCount` 노출 ② `ReviewRepository`에 `AVG(rating)` 집계 추가 | 1군 (상세 화면) |
| B-5 | 마이페이지 "N편 관람" | `UserProfileResponse`에 `watchedCount` 없음 | 없어도 우회 가능(`records`의 `totalElements`) | 낮음 |
| B-6 | 컬렉션 카드 미리보기 포스터 | `CollectionResponse`에 포스터 없음 | 없으면 N+1. 미리보기 필드 추가 | 2군 |
| B-7 | **컬렉션 단건 조회** | Service 메서드 부재 (잔여 #4) | 딥링크 필요 시 `getCollection` 추가 | 2군 |
| **B-8** | **리포트 API 전체** | **M3-a 미착수** — 설계는 기획노트 2-4에 완료 | 통계·캘린더·월말 리포트 엔드포인트 | **2군 블로커** |
| **B-9** | **`theater` 테이블이 비어 있음** | `TheaterSeedService` 호출 엔드포인트 부재 (잔여 #5) | 좌표계 EPSG:5174→WGS84 확인 + 시드 엔드포인트 | **3군 블로커** |
| **B-10** | **소셜 활동 피드 API 없음** | 팔로우·댓글은 있으나 피드가 없다 | 아래 참고 | **3군 블로커** |
| **B-11** | 추천 API | **M3-b 백지** (R-1~R-4 미결) | 설계 세션 선행 | 3군 블로커 |
| B-12 | 검색 정렬·필터 | `query`/`year`만 지원 (잔여 #22) | 장르 필터·정렬 UI는 불가 | 낮음 |

### 11.1 B-1 상세 — 카카오 로그인은 prebuild 전환의 앞단이다

**설정값 추가(`allowed-audiences`에 네이티브 앱 키 한 줄)는 5분이지만, 그 값이 실제로 오는지
검증하려면 카카오 네이티브 SDK가 돌아야 하고 그건 Expo Go에서 안 된다.**

⚠️ **키 해시는 콘솔 등록의 입력이 아니라 첫 빌드의 산출물이다.** 키스토어가 없으면 해시도
없으므로, "콘솔 등록 → 나중에 빌드" 순서로 잡으면 반드시 막힌다.

| 단계 | 내용 | 시점 |
|---|---|---|
| 1 | `app.json`에 `android.package` / `ios.bundleIdentifier` 확정 (역도메인, **스토어 등록 후 변경 불가**) | ✅ 완료 (2026-08-28) |
| 2a | 카카오 콘솔 — 네이티브 앱 키 복사 · **iOS 번들 ID 등록**(해시 불필요) · **Android 패키지명만 등록** | 지금 |
| 3 | `application-secret.yml`의 `allowed-audiences`에 네이티브 앱 키 **추가**(REST 키는 유지 — 런북 재검증 수단) | ✅ 완료 (2026-08-28) |
| 4 | `@react-native-kakao/*` 설치 → config plugin → **`npx expo prebuild`** → `eas build --profile development` | M2-B 후반 |
| 2b | **키 해시 등록** — 4단계 빌드 직후 | M2-B 후반 |
| 5 | E2E: `nonce` → SDK 로그인 → `POST /api/auth/oauth/kakao` | M2-B 후반 |

**키 해시 — 어느 키스토어인지가 핵심.** 등록할 값은 *그 APK에 실제로 서명한 키*의 해시다.

| 설치 방식 | 서명 키 | 확인 |
|---|---|---|
| `eas build --profile development` | EAS 관리 키스토어 | `eas credentials` → SHA-1 → base64 |
| `npx expo run:android` | `~/.android/debug.keystore` | `keytool -list -v -alias androiddebugkey …` |
| Play 배포 (M5) | **Play 앱 서명 키**(구글 재서명) | Play Console → 앱 서명 |

- 로컬 디버그 해시만 등록하고 EAS 빌드에서 `KOE009`를 만나는 것이 가장 흔한 사고다.
  **셋 다 결국 등록**하게 되므로 나오는 대로 추가한다(카카오는 복수 등록을 허용).
- ⚠️ **Play 앱 서명 키를 빠뜨리면 개발 내내 정상이다가 스토어 배포 후에만 로그인이 깨진다.**
  M5 체크리스트 항목이다.
- 실무 팁 — 해시를 미리 계산하지 말고 **일단 로그인을 시도**하면 SDK가 전송한 키 해시를
  에러/logcat에 찍어준다. 그 값을 복사하는 편이 빠르다.

**prebuild를 미루는 대안** — `expo-auth-session` 브라우저 OIDC를 쓰면 `aud`가 **REST API 키로
유지**되어(이미 검증된 값) B-1도 prebuild도 불필요하다. 다만 브라우저 플로우는 authorization
`code`를 토큰으로 교환해야 하는데 **이 앱은 client secret이 활성화돼 있어**(런북의 KOE010)
시크릿을 앱 번들에 넣을 수 없다. → **백엔드에 `code`를 받는 엔드포인트 추가**가 필요하다
(현재 `/api/auth/oauth/{provider}`는 `idToken`만 받는다). *"설정 한 줄 vs 백엔드 엔드포인트 하나"* 의 교환이다.

> 💡 **prebuild 결정을 카카오 로그인 하나로 내리지 말 것.** §13이 지적한 지도 네이티브 SDK가
> 두 번째 요구이며, 어차피 Dev Client로 가야 한다면 **같은 시점에 묶어 전환하는 것이 총비용이 낮다.**
> 기획노트 4-INF가 카카오 로그인 실기기 연결을 **배포 트리거(9월 중순)** 로 잡아둔 것과 일정이 맞는다.

### B-10 상세 — 소셜 화면은 다시 설계해야 한다

와이어프레임 `SocialScreen`은 **활동 피드**(누가 무엇을 봤다/리뷰했다/컬렉션을 만들었다)인데,
백엔드에 이에 대응하는 엔드포인트가 없다. 있는 것은 팔로우 관계와 댓글뿐이다.

선택지는 둘이다.

| 안 | 내용 | 비용 |
|---|---|---|
| **A. 피드 API 신설** | `GET /api/feed` — 팔로잉 사용자의 최근 활동 통합 | 백엔드 중간. `watch_record`/`review`/`collection` UNION + 공개범위 필터 |
| **B. 화면을 재설계** | 활동 피드 대신 **팔로잉 목록 → 그 사람의 기록/컬렉션 보기** | 백엔드 0. 기존 API로 구현 가능 |

**캡스톤 일정에서는 B를 권한다.** `GET /api/users/{userId}/records`·`/collections`·`/followings`가
이미 공개범위 정책까지 적용된 상태로 존재하므로, "팔로잉한 사람의 서재를 구경하는" 화면은
**추가 백엔드 없이 지금 만들 수 있다.** 활동 피드는 M4(알림)와 함께 검토한다.

### 지금 바로 확인할 것 (8월 말)

기획노트 4-M2 선행 작업 표에서 아직 열려 있는 항목:
- `DevLog.md` 갱신 (M1 종료 선언)
- **`security-spec.md` L-10(`jwt.secret` 환경변수)·L-11(시간대 고정)** — 배포를 기다리지 않는다.
  L-11은 특히 중요하다. 로컬 KST / 클라우드 UTC가 9시간 어긋나면 `expires_at`이
  **"로그인하자마자 만료"** 같은 엉뚱한 증상으로 나와 추적이 오래 걸린다.

---

## 12. M2-A 실행 순서

> 📄 **파일 단위 상세 스펙은 `docs/M2A-foundation-spec.md`에 있다.** 아래는 그 요약이다.

> **원칙: 네비게이션이 끝까지 도는 것을 먼저 확인하고, 그 다음에 화면 내용을 채운다.**
> 화면부터 만들면 라우팅을 나중에 갈아끼우며 전부 다시 손대게 된다.

| # | 작업 | 검증 |
|---|---|---|
| 1 | `develop` 브랜치 생성, `feature/m2-foundation` 분기 | 기획노트 5절 브랜치 전략 |
| 2 | 패키지 설치 → `npx expo-doctor` | 통과 |
| 3 | **스타일링 라이브러리 실빌드 검증** (NativeWind → 실패 시 Uniwind) | 실기기에서 `className` 적용 확인 |
| 4 | 백엔드 기동 → `npm run gen:api` → `src/types/api.d.ts` 커밋 | `MovieDetailResponse` 등이 생성되는지 |
| 5 | `src/theme/tokens.ts` · `src/constants/tmdb.ts` | |
| 6 | `src/components/primitives/` (Screen · Txt · Card · Button) | |
| 7 | `src/api/client.ts` — **단일 비행 refresh 인터셉터** (§6.3) | 동시 401 시 `reissue`가 1회만 호출되는지 |
| 8 | `src/store/authStore.ts` (zustand + SecureStore, 3상태) | |
| 9 | `src/api/*.ts` + `src/hooks/*.ts` 시그니처 (목 어댑터 포함) | |
| 10 | `src/navigation/**` **전체 골격** — 모든 화면은 플레이스홀더 | **탭 5개 · 스택 전부 이동 가능** |
| 11 | 부팅 시퀀스 (SplashScreen 유지 + SecureStore 복원) | 앱 실행 시 로그인 화면이 깜빡이지 않는지 |

**M2-A 완료 판정** — 앱을 켰을 때 ① 스플래시가 유지되다가 ② 토큰 유무에 따라 로그인/메인으로
바로 진입하고 ③ 탭 5개와 모든 하위 화면(플레이스홀더)로 이동·복귀가 되면 끝이다.

이어지는 순서:
- **M2-B (1군)**: Login/SignUp/카카오 → Home → SearchResult(2섹션+sync) → MovieDetail
  (기록/리뷰/찜) → MyRecords → MyPage/Settings
- **M2-C (2군)**: Wishlist → CollectionList/Detail → (B-8 해소 후) Report
- **M2-D (3군)**: B-9~B-11 해소분만

### ⚠️ 타입 생성은 이 세션에서 대신 해줄 수 없다

`openapi-typescript`는 로컬 백엔드(`localhost:8080`)에 접근해야 하는데, 이 세션의 셸은
격리된 리눅스 VM이라 Windows 호스트의 `localhost`에 닿지 않는다. **4번 단계는 Windows에서
직접(또는 Claude Code로) 실행**해야 한다.

---
## 13. 부록 — 지도 구현 전환 대비 설계 (3군)

### 13.1 배경

⚠️ **CineMap은 3군이며 `theater` 테이블이 비어 있어 M2 초반에는 착수하지 않는다**(B-9). 아래는 착수 시점에 쓸 설계다.

WebView 방식(a안)으로 시작합니다. 다만 조작감 문제로 네이티브 SDK(b안)로 전환할 가능성이 있으므로, **전환 비용을 코드 1~2파일로 묶어두는 것**을 M2-C 착수 조건으로 둡니다.

### 13.2 WebView 방식의 실제 성능 특성

| 구간 | 체감 | 대응 |
|---|---|---|
| 초기 로딩 (0.5~1.5s) | **큼** | ① 탭 전환 시 WebView 언마운트 금지 (`MainTab`의 `unmountOnBlur: false`) ② 카카오 SDK를 로컬 asset으로 번들 ③ 로딩 오버레이 |
| 팬/줌 제스처 | 작음 | WebView 내부에서 완결되어 RN 브리지를 거치지 않음. 저사양 Android에서만 차이 |
| **제스처 충돌** | **큼** | 지도(상단 50%) ↔ 리스트(하단 50%) 경계에서 스크롤이 샘. 지도 컨테이너에 명시적 터치 responder 설정, Android는 `nestedScrollEnabled` 확인 |
| 마커 탭 반응 | 없음 | `postMessage` 왕복 16~50ms |

### 13.3 격리 인터페이스 (필수)

```ts
// src/components/map/types.ts
import type { Theater } from '@/types/theater';

export interface CineMapViewProps {
  theaters: Theater[];
  selectedTheaterId: number | null;
  center: { latitude: number; longitude: number };
  onMarkerPress: (theaterId: number) => void;
  onMapReady?: () => void;
}

export interface CineMapViewHandle {
  moveTo(latitude: number, longitude: number): void;
  fitToTheaters(theaters: Theater[]): void;
}
```

```ts
// src/components/map/index.ts — 구현 교체 지점
export { CineMapWebView as CineMapView } from './CineMapWebView';
// b안 전환 시 이 한 줄만 교체:
// export { CineMapNative as CineMapView } from './CineMapNative';
```

**철칙**
1. `CineMapScreen`에 `WebView` / `postMessage` / 카카오 SDK 관련 타입이 **단 하나라도 import되면 추상화 실패**입니다.
2. **줌 레벨을 인터페이스에 노출하지 마세요.** 카카오는 `level` 1~14 (낮을수록 확대), 구글은 `zoom` 0~20 (높을수록 확대)로 **의미가 반대**입니다. 그대로 뚫으면 교체 시 화면이 뒤집힙니다. `fitToTheaters()` 같은 의도 단위 API만 노출합니다.
3. 좌표 단위는 `{ latitude, longitude }`로 통일합니다 (카카오 JS SDK는 `lat/lng`, 일부 API는 `y/x`를 씁니다 — 어댑터 내부에서만 변환).

### 13.4 전환 비용 정리

| 항목 | 비용 | 되돌리기 |
|---|---|---|
| 코드 (인터페이스 격리 시) | 반나절~1일 | 쉬움 |
| **`expo prebuild` → Dev Client 전환** | **높음** — Expo Go 사용 불가, 팀 전원 dev client 재빌드, EAS 빌드 쿼터 또는 로컬 빌드 환경(iOS는 맥) | **사실상 편도** |
| 카카오 네이티브 앱 키 발급·플랫폼 등록 | 낮음 | — |

### 13.5 b안 후보 비교

| | 카카오 네이티브 (`@react-native-kakao/map` 등) | `react-native-maps` |
|---|---|---|
| 한국 지도 품질 | 최상 | 구글 지도는 국내 데이터 반출 규제로 상세도 낮음. iOS `PROVIDER_DEFAULT`(Apple Maps)는 상대적으로 나음 |
| 생태계 | 커뮤니티 래퍼 (비공식). 착수 전 다운로드 수·최근 커밋·이슈 확인 필요 | 표준, 문서 풍부 |
| Expo SDK 56 | 확인 필요 | ⚠️ config plugin이 SDK 56에서 깨짐 (`@expo/config-plugins` 경로 문제, 미해결). 워크어라운드: `npx expo install @expo/config-plugins` |

> 좌표를 백엔드가 공급하므로 앱의 지도는 "아는 좌표에 마커 찍기"만 합니다. 카카오의 POI 검색 정확도는 이미 백엔드에서 확보된 상태라, 렌더링 레이어 선택은 **지도 배경 품질**과 **Expo 호환성**만 보고 판단하면 됩니다.

### 13.6 판단 시점

- **결정 시점**: M2-C에서 a안을 실기기로 만져본 뒤. 추측으로 prebuild를 결정하지 않습니다.
- **전환 적기**: M3 초입 — M2 화면이 모두 끝나 회귀 테스트 범위가 명확해진 시점.
- **중요**: prebuild 결정을 지도 하나로 내리지 마세요. 카카오 로그인·푸시 알림 등 다른 네이티브 요구가 생기면 어차피 필요하므로, **묶어서 한 번에 전환하는 것이 총비용이 낮습니다.**

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-08-28 | **`docs/M2A-foundation-spec.md` 신설 — §12를 파일 단위로 상세화.** npm 레지스트리 실측으로 스타일링 판단 근거를 확보했다: `nativewind@4.2.6`은 `peerDependencies`가 `{tailwindcss:'>3.3.0'}` 하나뿐이라 **RN·React 버전에 대해 아무 선언이 없고**, `uniwind@1.11.0`은 `react-native>=0.81.0`·`react>=19.0.0`·`tailwindcss>=4`를 **명시**한다(이 프로젝트의 RN 0.85/React 19.2 포함). **NativeWind v4 채택 시 `tailwindcss@^3.4` 핀이 필수**임도 확인 — peer 범위가 최신 4.3.3을 형식상 통과시키지만 조용히 스타일이 안 먹는다. Expo 56 `bundledNativeModules.json` 대조로 필요한 네이티브 패키지가 전부 관리 대상임을 확인했다(`lucide-react-native`의 `react-native-svg ^15` peer 충돌 없음). §12 상단에 상세 문서 링크 추가 |
| 2026-08-28 | **B-1~B-3 정정 (§11, §11.1 신설).** 실제 설정 파일을 확인한 결과 **B-2·B-3는 이미 처리돼 있었다** — `nonce-ttl`은 `application.yml:73`에 `PT5M`이고 `application-secret.yml`에 오버라이드가 없다(런북의 검증용 `PT15M`은 이미 복구됨). CORS도 `8081`/`19006`이 등록돼 있고, 무엇보다 **RN 네이티브는 CORS 적용 대상이 아니다**(설정 파일 주석이 이미 정확히 짚고 있었다) — Expo 웹에서만 의미가 있어 1군 필수가 아니다. v2에서 셋을 묶어 *"전부 설정 한 줄"* 이라고 쓴 것은 파일을 확인하지 않고 기획노트 언급만 보고 옮긴 결과다. **B-1은 반대로 과소평가돼 있었다** — 설정값 추가 자체는 한 줄이 맞지만 **검증이 Dev Client 빌드에 묶여 있어 독립 작업이 아니다.** 특히 **키 해시가 콘솔 등록의 입력이 아니라 첫 빌드의 산출물**이라, 처음 제시한 *"콘솔 등록(2단계) → 나중에 prebuild(4단계)"* 순서는 키스토어가 없는 상태에서 해시를 요구하는 **순환**이었다. 2단계를 2a(패키지명·번들 ID·앱 키 — 지금)와 2b(키 해시 — 빌드 직후)로 분리했다. 키 해시는 *그 APK에 실제로 서명한 키* 기준이라 EAS 관리 키스토어 / 로컬 `debug.keystore` / **Play 앱 서명 키** 셋을 구분해야 하며, 마지막 것을 빠뜨리면 **개발 내내 정상이다가 스토어 배포 후에만 로그인이 깨진다**(M5 항목으로 등록). prebuild를 미루는 대안(`expo-auth-session` 브라우저 OIDC → `aud`가 이미 검증된 REST API 키로 유지)도 함께 적었으나, client secret이 활성화돼 있어 **백엔드에 code 교환 엔드포인트 추가가 선행**돼야 한다. **근거** — `cinemory-backend/src/main/resources/application.yml`·`application-secret.yml` 실측, `docs/kakao-login-runbook.md` 0단계·마지막 절, `docs/security-spec.md` L-7 |
| 2026-08-28 | **v2 전면 개정 — v1의 API 계약을 폐기하고 실제 백엔드 표면으로 교체.** v1은 *"백엔드가 미구현"* 이라는 잘못된 전제로 작성됐다(`CineMory_기획노트.md`와 `cinemory-backend/docs/`를 읽지 않고 와이어프레임만 보고 썼다). 실제로는 Step S·Step5 완료로 **컨트롤러 16개 + `/v3/api-docs`가 이미 존재**하며, 5-7 D에서 `openapi-typescript` 생성 파이프라인까지 검증돼 있었다. ① **손으로 쓴 도메인 타입 전체 삭제 → 생성 방식으로 전환**(§4). v1의 필드명은 거의 전부 실제와 달랐다(`MovieSummary.movieId` vs 실제 `MovieListItemResponse.id`, `posterUrl` vs `posterPath`, `genres: string[]` vs `GenreResponse[]` 등). ② **별점 스케일 정정** — v1은 사용자 1~5 / 외부 0~10으로 나눴으나 실제로는 `review.rating`·`watch_record.rating` **둘 다 Double 0.0~10.0**이다. 와이어프레임의 5점 별 UI를 쓰려면 ×2 변환이 필요하며, 범위 위반이 `@Valid`가 아니라 엔티티 `IllegalArgumentException` 경로로 나가 폼 에러 매핑에서 누락되기 쉬운 점을 §7.3에 명시. ③ **`watch_record` ↔ `review` 분리** — v1은 `WatchRecord`에 `review` 필드를 넣어 하나로 뭉쳤으나, 실제로는 회차별 비공개 기록과 영화당 1개 공개 리뷰로 **리소스가 다르다**. 화면에서도 "기록 남기기"와 "리뷰 쓰기"를 분리하도록 §9.3 개정. ④ **검색 계약 정정** — `{registered, suggestions}` 2섹션이며 `suggestions`에 `movieId`가 없는 것이 미등록 신호다. 미등록 선택 시 `POST /api/movies/sync`로 등록한 뒤 이동하는 플로우를 §9.2에 추가. `page`가 이 엔드포인트만 **1-based**인 점도 명시. ⑤ **§6 인증 전면 신설** — 백엔드가 **리프레시 회전 + 재사용 감지**를 구현하고 있어, 동시 401에서 각자 `reissue`를 호출하면 두 번째가 `REFRESH_TOKEN_REUSED`를 맞고 **전 세션이 폐기돼 사용자가 이유 없이 로그아웃된다.** 재현이 어려운 유형이라 **단일 비행(single-flight) 인터셉터**를 설계로 못박았다(§6.3). ⑥ **화면 우선순위를 기획노트 4-M2의 1군/2군/3군으로 교체**(§2) — v1의 임의 순서를 폐기. 3군(social·cinemap·recommend)이 뒤로 간 이유가 취향이 아니라 **백엔드 부재**임을 §11에 근거와 함께 정리했다. 특히 **와이어프레임 `SocialScreen`의 활동 피드에 대응하는 API가 아예 없다**는 것을 발견해(B-10) 피드 API 신설 대신 "팔로잉한 사람의 서재 보기"로 화면을 재설계하는 안을 권고했다 — 기존 API만으로 백엔드 추가 없이 구현된다. ⑦ **폴더 구조를 기획노트 6절의 도메인별 `screens/*/`로 교체**(§3). ⑧ **§11 백엔드 선행 항목 12건 신설** — B-1(카카오 네이티브 앱 키 `aud` 추가)·B-2(nonce TTL 복구)·B-3(CORS Expo origin)은 1군 착수 전 필수이며 셋 다 설정 한 줄이다. ⑨ TMDB 이미지 base URL을 `src/constants/tmdb.ts` 한 곳으로 못박고(§7.2) 기획노트가 지정한 `w185`/`w500`을 반영. ⑩ 지도 부록은 §13으로 이동하고 3군 표시를 붙였다. **근거** — `cinemory-backend/docs/controller-layer-spec.md`(858줄) 전문, `security-spec.md` S-2·S-3·S-J, `tmdb-sync-spec.md` 6-3·6-8·잔여 #24, 그리고 `src/main/java/` 실제 record 선언(문서보다 강한 근거로 채택) |
| 2026-08-27 | v1 작성 — `cinemory-wireframe` 16개 화면 분석 기반. **API 계약은 추정이었고 v2에서 폐기됨** |
