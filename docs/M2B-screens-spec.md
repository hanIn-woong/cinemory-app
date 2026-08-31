# CineMory M2-B — 1군 화면 구현 스펙

> 상위 문서: `docs/M2-frontend-spec.md` — **계약과 사실은 그쪽, 실행과 검증은 여기**
> (분담 기준은 상위 문서의 「📚 문서 구성」)
> 선행 단계: `docs/M2A-foundation-spec.md` (✅ 완료 2026-08-30)
> 대상: `cinemory-app` — Expo SDK 56 / RN 0.85 / React 19.2 / TypeScript

**범위** — 기획노트 4-M2의 **1군**: `Login` · `SignUp` · `Home` · `SearchResult` ·
`MovieDetail` · `MyRecords` · `MyPage`/`Settings`

**M2-B 완료 판정** — 실기기에서 **로그인 → 검색 → 영화 선택 → 시청 기록 저장 → 내 기록에
반영 확인**까지 한 번에 이어진다. 이 동선이 앱의 정체성이며 백엔드가 완비된 부분이다.

> **단계 공통 원칙 (상위 §12)** — 뼈대가 끝까지 도는 것을 먼저 확인하고 내용을 채운다.
> M2-A가 *"화면보다 네비게이션 먼저"* 였다면, **M2-B는 *"레이아웃보다 데이터 흐름 먼저"*** 다.
> `api → hooks → 로딩/에러/빈 상태`가 한 화면에서 돌아가는 것을 확인한 뒤 나머지 화면을 찍어낸다.

---

## 0. 착수 전 — M2-A가 남긴 것 정리

M2-A는 **시그니처만** 만들고 본문을 비워 뒀다. 착수 첫 작업은 그 자리를 채우는 것이다.

| # | 항목 | 현재 | 할 것 |
|---|---|---|---|
| 1 | `src/api/*.ts` | **전부 빈 파일** | 실제 호출 구현 (§2) |
| 2 | `src/hooks/*.ts` | `notImplemented()` 던짐 | 실제 연동 (§3) |
| 3 | `useMovies.ts`의 `type MovieDetailResponse = unknown` | `api.d.ts` 생성 전 임시 | **`S['MovieDetailResponse']` 별칭으로 교체** |
| 4 | `src/hooks/_stub.ts` | 스텁 헬퍼 | 마지막 훅을 채운 뒤 **파일째 삭제** |
| 5 | CRLF 21개 | `.gitattributes` 추가됨 | `git add --renormalize .` 후 커밋 |
| 6 | **`RootNavigator`가 `status`로 분기** | M2-A 구조 | ⚠️ **게스트 우선으로 재구성** (§0.1) |

> 3번은 `api.d.ts`가 이미 생성돼 있으므로 지금 바로 가능하다. `unknown`을 남겨두면
> `MovieDetail` 화면 전체가 타입 검사를 못 받는다.

### 0.1 ⚠️ 게스트 우선 전환 — 화면 작업보다 먼저 한다

**2026-08-30 확정**(상위 §6.7). 비로그인이 기본이고 로그인은 선택이다. M2-A는 `RootNavigator`가
`status`로 `AuthNavigator` ↔ `MainTabNavigator`를 갈아끼우는 구조였고, 그대로 두면 **게스트가
검색 화면에 도달조차 못 한다.**

**선행 작업 4건**

| # | 작업 | 내용 |
|---|---|---|
| 1 | `RootNavigator` 재구성 | `Main`(항상) + `AuthModal`(`presentation: 'modal'`). `status` 분기 제거 |
| 2 | `navigation/types.ts` | `RootStackParamList`을 `{ Main, AuthModal }`로 |
| 3 | **`useRequireAuth()`** 훅 | 액션 게이트 — 미로그인이면 모달을 올린다 |
| 4 | **`<AuthRequired>`** 부품 | 화면 게이트 — 안내 + `로그인` 버튼 |
| 5 | **인터셉터 게스트 가드** | `status !== 'authenticated'`면 401에서 refresh·logout 하지 않는다 |

> **왜 화면보다 먼저인가** — 이 다섯을 나중에 넣으면 이미 만든 화면을 전부 다시 열어
> 게이트를 끼워 넣어야 한다. 뼈대 먼저라는 단계 공통 원칙(상위 §12)이 여기에도 적용된다.

**게스트로 열리는 것과 막히는 것의 경계는 상위 §6.7의 표를 따른다.**

---

## 1. 실행 순서

**세로로(화면 하나를 끝까지) 가지 말고, 가로로(계층별로) 간다.** 첫 화면에서 데이터 흐름을
확정한 뒤 나머지를 복제하는 편이 총비용이 낮다.

| # | 작업 | 산출물 | 검증 |
|---|---|---|---|
| 0 | **게스트 우선 전환** (§0.1) | `RootNavigator` · `useRequireAuth` · `AuthRequired` · 인터셉터 가드 | 앱 실행 시 **로그인 없이 홈** 도달 |
| 1 | `src/api/*.ts` 구현 (§2) | auth · movie · record · review · wishlist · user | 타입 통과 |
| 2 | `src/hooks/*.ts` 구현 (§3) | 훅 + 무효화 매트릭스 | `_stub.ts` 삭제 가능 |
| 3 | 공통 화면 부품 (§4) | `PosterImage` · `MovieListItem` · `RatingStars` 등 | |
| 4 | **`Login` / `SignUp`** (§5.1) | 인증 동선 | **로그인 성공 시 탭으로 자동 전환** |
| 5 | **`SearchResult`** (§5.3) ★ | 2섹션 + sync | 미등록 영화 선택 → 상세 진입 |
| 6 | `Home` (§5.2) | 검색 진입점 | |
| 7 | **`MovieDetail`** (§5.4) ★★ | 기록·리뷰·찜 | **동시 401 실경로** |
| 8 | `MyRecords` (§5.5) | 목록 | 7번에서 저장한 기록이 보인다 |
| 9 | `MyPage` / `Settings` (§5.6) | 프로필·로그아웃 | |
| 10 | 검증 (§7) | | 핵심 동선 1회 완주 |

> **4번(로그인)을 5번(검색)보다 먼저 하는 이유** — `POST /api/movies/sync`가 인증 필수라
> 로그인 없이는 검색의 절반(미등록 영화 선택)을 시험할 수 없다. 또 M2-A의 디버그 프로브를
> 지웠으므로 로그인 화면이 없으면 인증 상태를 만들 방법이 없다.
> **게스트 우선으로 바뀌어도 이 순서는 유지된다** — 게스트로 검색은 되지만 `sync` 경로를
> 검증하려면 여전히 로그인이 필요하다.
> **5번을 6번보다 먼저** 하는 것은 `Home`이 검색창 하나뿐이라 결과 화면이 없으면 확인할 게 없어서다.

---

## 2. `src/api/` 구현

각 모듈은 **얇은 함수 모음**이다. 분기·조합·계산을 두지 않는다(그건 훅 소관).

```ts
// src/api/movie.ts 예시
import { api } from './client';
import { EP } from './endpoints';
import type { MovieSearchResponse, MovieDetail } from '../types';

export const movieApi = {
  search: (query: string, page: number, year?: number) =>
    api.get<MovieSearchResponse>(EP.movies.search, { params: { query, page, year } })
       .then(r => r.data),

  detail: (movieId: number) =>
    api.get<MovieDetail>(EP.movies.detail(movieId)).then(r => r.data),

  sync: (tmdbId: number) =>
    api.post<{ movieId: number }>(EP.movies.sync, { tmdbId }).then(r => r.data),
};
```

### ⚠️ 204를 정상 값으로 변환한다 — `GET /api/reviews/me`

이 엔드포인트만 **리뷰가 있으면 200 + 바디, 없으면 204 + 바디 없음**이다.
axios는 204에서 `response.data`를 `''`(빈 문자열)로 준다. 그대로 흘리면 **빈 문자열이
`ReviewResponse` 행세를 하며 화면까지 내려간다.**

```ts
// src/api/review.ts
myReview: (movieId: number) =>
  api.get(EP.reviews.me, { params: { movieId } })
     .then(r => (r.status === 204 ? null : (r.data as Review))),   // ★ null로 정규화
```

훅과 화면은 `Review | null`만 본다. **"리뷰 없음"은 에러가 아니라 정상 상태**다.

### 목 어댑터

M2-A에 설계만 있고 구현이 없다. **지금은 만들지 않는다** — 백엔드가 로컬에서 도는 것이
확인됐으므로 목이 없어도 막히지 않고, 두 벌을 유지하는 비용만 생긴다.
백엔드가 장기간 불가한 상황이 오면 그때 `api/mock/`을 만든다.

---

## 3. `src/hooks/` 구현

### 3.1 화면이 보는 유일한 계층

화면은 `api/`를 import하지 않는다. 훅이 **로딩·에러·캐시·무효화**를 전부 흡수한다.

### 3.2 무효화 매트릭스 — 이 표를 그대로 구현한다

| 액션 | `invalidateQueries` 대상 |
|---|---|
| 시청 기록 생성/삭제 | `['records']` · `['movies','detail',movieId]` |
| 대표 기록 변경 | `['records','ofUserMovie',userId,movieId]` |
| 리뷰 upsert/삭제 | `['reviews','me',movieId]` · `['movies','reviews',movieId]` |
| 찜 토글 | `['wishes']` — **낙관적 업데이트 후 무효화** |
| 프로필 수정 | `['users','me']` |
| **미등록 영화 sync** | `['movies','search']` — 다음 검색에서 `registered`로 올라온다 |

### 3.3 무한 스크롤 — `last`로 판정한다

```ts
getNextPageParam: (lastPage, allPages) =>
  lastPage.registered.last ? undefined : allPages.length + 1,
```

⚠️ **`registered.page`를 다음 페이지 계산에 쓰지 마라.** 응답 안의 `page` 필드는 **0-based**인데
요청 쿼리 파라미터는 **1-based**다(이 엔드포인트만). 섞으면 2페이지를 건너뛰거나 1페이지를
두 번 불러온다. **`allPages.length + 1`이 안전하다.**

⚠️ `content.length === 0`으로 종료를 판정하지 않는다 — 상위 §5.1.

### 3.4 ★ 인증 의존 훅은 `enabled`로 막는다 — 게스트 우선에서 필수다

게스트가 상시 존재하므로 **이 게이팅이 선택이 아니라 필수**가 됐다.

```ts
const isAuthed = useAuthStore(s => s.status === 'authenticated');
useQuery({ ..., enabled: isAuthed });
```

**`enabled: isAuthed`가 필요한 훅**

| 훅 | 이유 |
|---|---|
| `useWatchLog` · `useMyReview` · `useIsWished` | 상세 화면의 개인 데이터 3종 |
| `useMyRecords` · `useMe` | 인증 전용 화면 |

빠뜨리면 **게스트가 상세 화면에 들어가는 것만으로 401이 세 번 난다.** 그리고 인터셉터가
`logout()` 경로를 타면서 refresh 시도까지 낭비된다.

⚠️ **`enabled`와 짝으로 인터셉터 게스트 가드도 필요하다**(§0.1-5, 상위 §6.7). 훅 하나를
빠뜨렸을 때 조용히 새는 것을 막는 이중 방어다.

---

## 4. 공통 화면 부품 — `src/components/movie/`

화면을 만들기 전에 이것부터 만든다. 1군 화면 다섯 개가 전부 재사용한다.

| 컴포넌트 | 역할 | 주의 |
|---|---|---|
| `PosterImage` | `posterPath` → 이미지, 없으면 폴백 그라데이션 | **폴백 색은 `posterFallbackPalette[movieId % 8]` 결정론적**. 랜덤이면 재렌더마다 깜빡인다 |
| `MovieListItem` | 가로형 (포스터 80×112 + 제목·연도·장르) | `SearchResult` · `MyRecords` 리스트 모드 공용 |
| `MovieGridItem` | 3열 그리드 셀 | `MyRecords` 그리드 모드 |
| `RatingStars` | **사용자 별점** 표시/입력 | §4.1 |
| `ExternalRating` | **외부 평점**(0~10 그대로) 표시 | `RatingStars`와 이름을 반드시 구분한다 |

### 4.1 `RatingStars` — 스케일 변환을 여기 가둔다

백엔드는 `Double` **0.0~10.0**, UI는 별 5개다(상위 §7.3).

```ts
// src/utils/rating.ts — 변환은 이 파일 밖에서 하지 않는다
export const apiToStars = (r: number) => r / 2;   // 8.0 → 4.0
export const starsToApi = (s: number) => s * 2;   // 4.5 → 9.0
```

- 반개 단위 입력 → API 값은 1.0~10.0의 정수 단위가 된다
- **같은 별을 다시 누르면 해제**되게 한다(0점으로 되돌릴 방법이 필요하다)
- ⚠️ **범위 위반은 `@Valid`가 아니라 엔티티 예외 경로로 나간다** — 응답 `code`가
  `INVALID_INPUT_VALUE`가 아니어서 폼 에러 매핑에서 누락된다. **클라이언트에서 먼저 막는다.**

---

## 5. 화면별 구현

> 화면의 **요구사항·레이아웃**은 상위 문서 §9.1~§9.5에 있다.
> 여기에는 **구현 시 걸리는 것**만 적는다.

### 5.1 `Login` · `SignUp`

**필드명이 두 DTO에서 다르다.** 복붙하면 반드시 틀린다.

| | 필드 |
|---|---|
| `POST /api/auth/signup` | `{ email, `**`rawPassword`**`, nickname }` |
| `POST /api/auth/login` | `{ email, `**`password`**` }` |

**로그인 성공 후 2단계가 필요하다** (M2-A §12-1에서 확인)

```
1. POST /api/auth/login → TokenResponse → authStore.setTokens(res)
2. GET  /api/users/me   → UserResponse  → authStore.setUser(res)
```

`login`은 **사용자 정보를 주지 않는다.** 2번을 빠뜨리면 `MyPage`가 빈 화면이 된다.

**검증 규칙**

- 비밀번호 **8~64자** (가입·재설정·변경 공통)
- 닉네임 **가입 max 50 / 변경 API max 30** — ⚠️ **비대칭이다.** 각각 맞춘다
- 서버 `errors[]`를 `react-hook-form`의 `setError`에 필드명으로 매핑

**⚠️ 로그인 화면은 이제 모달이다** (게스트 우선, 상위 §6.7)

```
성공 → authStore.setTokens() + setUser() → navigation.goBack()   // 모달을 닫는다
```

뒤에 있던 화면이 그대로 남아 있고, 훅들이 재조회되며 로그인 상태로 다시 그려진다.

**절대 하지 말 것**

- ❌ 로그인 성공 후 `navigate('Main')` 또는 스택 `reset` — **모달을 닫기만 한다.**
  탭 스택을 갈아끼우면 사용자가 있던 자리를 잃는다(검색 도중 찜을 누른 경우 등).
- ❌ 로그아웃 시 화면 전환 — `status`만 `anonymous`가 되고 각 화면이 게스트 상태로 다시
  그려진다. 인증 전용 화면에 머물러 있었다면 **그 자리에서 `<AuthRequired>`로 바뀐다.**
- ❌ `password-reset/request` 응답으로 분기 — **계정 존재 여부와 무관하게 항상 200**이다
  (계정 열거 방지). 화면도 항상 "메일을 보냈습니다"로 동일하게 응답한다. 여기서 분기하면
  백엔드 방어가 무의미해진다.

**카카오 로그인은 버튼만 두고 비활성**으로 둔다 — prebuild가 필요하다(상위 §11.1).

### 5.2 `Home`

- 검색 `TextInput` + `onSubmitEditing` → `navigate('SearchResult', { query })`
- 배경 포스터는 `GET /api/box-office`(DAILY)로 채울 수 있다
  ⚠️ **`linked === false`인 항목은 `posterPath`가 `null`이다**(현재 매칭률 90.7%).
  `PosterImage` 폴백이 자동 처리하지만, 배경이 그라데이션 투성이면 `linked === true`만 거른다
- 배경 애니메이션(60초 루프)은 **우선순위 낮음.** 정적 그리드로 시작해도 된다

### 5.3 `SearchResult` ★ 2섹션이 핵심

```
SectionList
├─ [내 서재에 있는 작품]  registered   → navigate('MovieDetail', { movieId: item.id })
└─ [더 찾아보기]          suggestions  → sync 후 이동
```

**`suggestions` 항목 탭 동작**

```
1. 로딩 오버레이 ("작품 정보를 가져오는 중")   ← TMDB 왕복이라 체감된다
2. POST /api/movies/sync { tmdbId }
3. { movieId } 수신 → navigate('MovieDetail', { movieId })
4. invalidateQueries(['movies','search'])
```

| 항목 | 주의 |
|---|---|
| 인증 | `sync`는 **인증 필수**. 게스트가 탭하면 `useRequireAuth()`로 **로그인 모달**을 올린다. `registered` 항목은 게스트도 그대로 열린다 |
| 페이지 | 요청 `page`가 **1-based** (이 엔드포인트만). `initialPageParam: 1` |
| suggestions 범위 | **`page === 1`에서만** 채워진다. 2페이지부터 `registered`만 이어붙인다 |
| 개수 | 백엔드에 slice가 없어 **최대 20건이 그대로 온다.** 화면에서 5~10건으로 자른다 |
| 실패 | `TMDB_MOVIE_NOT_FOUND`(404) · `ADULT_CONTENT_NOT_ALLOWED`(400) → 토스트 |
| TMDB 장애 | `suggestions: []`로 폴백된다. `registered`는 정상이므로 **에러 화면을 띄우지 않는다** |

⚠️ **두 섹션을 하나로 합치지 마라.** `suggestions`에는 `movieId`가 없고 탭 동작이 다르다.
합치면 "가끔 탭이 안 먹는" 화면이 된다.

### 5.4 `MovieDetail` ★★ M2-B에서 가장 무거운 화면

**호출이 5개다.** 상위 §9.3의 표 그대로.

| 데이터 | 훅 | 조건 |
|---|---|---|
| 영화 정보 | `useMovieDetail(movieId)` | 항상 |
| 내 시청 기록(회차) | `useWatchLog(myId, movieId)` | 로그인 시 |
| 내 리뷰 | `useMyReview(movieId)` | 로그인 시. **204 = 없음(정상)** |
| 찜 여부 | `useIsWished(movieId)` | 로그인 시 |
| 공개 리뷰 목록 | `useMovieReviews(movieId)` | 항상 |

**게스트 상태의 상세 화면**

| 영역 | 게스트 |
|---|---|
| 영화 정보 · 줄거리 · 출연진 | ✅ 그대로 |
| 공개 리뷰 목록 | ✅ 그대로 |
| **내 기록 카드** | 🔒 카드 자리에 *"기록하려면 로그인"* + 버튼 |
| **찜 버튼** | 표시하되 탭 시 `useRequireAuth()` → 모달 |

⚠️ **개인 데이터 훅 3개(`useWatchLog` · `useMyReview` · `useIsWished`)에 `enabled: isAuthed`를
반드시 건다**(§3.4). 안 걸면 게스트가 이 화면에 들어오는 것만으로 401이 세 번 난다.

> ⚠️ **이 화면이 §12 D에서 검증한 동시 401이 실제로 발생하는 첫 지점이다.** 진입 시 5개가
> 병렬로 나가므로, access token이 만료된 순간에 들어오면 401이 동시에 터진다. 인터셉터의
> 단일 비행이 여기서 실전 검증된다 — **M2-B 검증(§7)에 이 화면 진입을 반드시 포함한다.**

**내 기록 카드 — 액션 4개를 성격별로 분리한다**

와이어프레임은 로컬 state 4개와 핸들러 없는 `저장하기` 버튼 하나였다. 실제로는 다르다.

| 액션 | 저장 시점 | API |
|---|---|---|
| **찜** | **즉시**, 낙관적 업데이트 | `POST /api/movies/{id}/wish` (토글) |
| **컬렉션 추가** | 즉시 (선택 시트) | `POST /api/collections/{id}/movies` — **M2-C로 미룬다** |
| **시청 기록** | 모달 → 저장 | `POST /api/records` |
| **리뷰** | 모달 → 저장 | `PUT /api/movies/{id}/review` (upsert) |

⚠️ **기록과 리뷰를 한 폼에 섞지 않는다.** 기록은 회차별 여러 개, 리뷰는 영화당 정확히 1개다
(상위 §5.3). 섞으면 두 번째 관람을 기록할 때 리뷰가 덮인다.

**시청 기록 모달**

- `movieId` 외 **전부 선택**이다. `watchDate`도 nullable — *"오래돼서 기억 안 남"* 을 허용한 설계다
- ⚠️ **`watchType === 'OTT'`면 `ottPlatformId` 필수, `THEATER`/`ETC`/`null`이면 있으면 안 된다.**
  위반 시 `INVALID_WATCH_TYPE_OTT_COMBINATION`(400). **클라이언트에서 먼저 막는다**
- 날짜: `@react-native-community/datetimepicker` — Android는 `DateTimePickerAndroid.open()`,
  iOS는 인라인. **플랫폼 분기가 필요하다**
- 회차가 2개 이상이면 목록으로 보여주고 `PATCH /api/records/{id}/representative`로 대표 지정

**출연진** — 상세 응답은 `displayOrder <= 20`(최대 21명)만 온다. 더보기는
`GET /api/movies/{id}/cast`(페이징, size 50). ⚠️ **인물명의 약 71%가 영문**이다 —
TMDB 한글화 커버리지 한계이며 우리 버그가 아니다.

**평점 영역은 자리만 잡고 숨긴다** — §6 참고.

### 5.5 `MyRecords`

- 🔒 **화면 게이트** — 게스트는 `<AuthRequired>`를 본다(상위 §6.7)
- `GET /api/users/{myId}/records` → `PageResponse<UserMovieListItemResponse>`
- `myId`는 `authStore.user.id`. **`user`가 `null`이면 조회하지 않는다**(`enabled`)
- 그리드(3열) ↔ 리스트 토글
- ⚠️ **정렬·필터 UI를 넣지 않는다.** 백엔드가 클라이언트 `sort` 파라미터를 **의도적으로
  지원하지 않는다**(5-0-D — 인덱스를 타지 않는 정렬이 조용히 만들어지는 것을 막기 위함).
  와이어프레임의 정렬/별점 필터는 state만 있고 동작하지 않는 미구현 부분이었다
- 찜 목록은 **별도 화면(M2-C)** 이다. 엔드포인트도 DTO도 다르므로 탭으로 묶지 않는다

### 5.6 `MyPage` · `Settings`

- 🔒 **화면 게이트** — 게스트는 `<AuthRequired>`를 본다. **마이페이지 탭 자체는 보이되**
  내용이 로그인 유도로 바뀐다(탭을 숨기지 않는다 — 탭 5개는 와이어프레임 확정 사항)
- 프로필: `GET /api/users/me`
- ⚠️ **`UserProfileResponse`에 `watchedCount`가 없다.** "N편 관람"은
  `GET /api/users/{myId}/records?size=1`의 `totalElements`로 얻는다
- 메뉴: 내 기록 · (M2-C: 내 컬렉션 · 찜 목록 · 시청 분석) · 프로필 수정 · 설정

**`Settings`** — 로그아웃 · 닉네임 변경 · 공개범위 변경 · 비밀번호 변경

| 액션 | 주의 |
|---|---|
| 로그아웃 | `POST /api/auth/logout` 호출 후 **성공·실패와 무관하게** `authStore.logout()`. 네트워크가 죽어도 로컬 로그아웃은 되어야 한다 |
| 닉네임 | max **30** (가입은 50) |
| **비밀번호 변경** | ⚠️ **204 성공 시 서버가 전 세션을 폐기한다.** 저장된 토큰을 버리고 **로그인 화면으로 보낸다.** 안 그러면 다음 재발급이 반드시 실패하며 "갑자기 로그아웃"으로 보인다 |

❌ **프로필 사진 업로드는 만들지 않는다** — `user.profile_image` 저장 위치가 미결이고
(security-spec **L-13**) **되돌리기가 가장 비싼 결정**이다. 카카오 프로필 URL만 표시한다.

---

## 6. 백엔드 선행 — **B-4** 하나뿐이다

상위 §11의 B-1~B-12 중 M2-B에 걸리는 것은 **B-4(영화 상세 평점)** 하나다. 나머지 1군 API는 완비돼 있다.

**현재 상태** — `MovieDetailResponse`에 평점 필드가 **하나도 없다.** `Movie` 엔티티에
`voteAverage`/`voteCount`가 있지만 DTO로 노출되지 않고, 우리 평점(`AVG(review.rating)`)
집계 쿼리도 `ReviewRepository`에 없다(tmdb-sync 잔여 **#24**, 처리 시점이
*"프론트 상세 화면 구현 시"* 로 지정돼 있다).

**요청할 것 2가지**

1. `MovieDetailResponse`에 `voteAverage`(TMDB) · `voteCount` 노출
2. `ReviewRepository`에 `AVG(rating)` · `COUNT` 집계 추가 → 응답에 우리 평점

> **둘은 대체 관계가 아니다.** TMDB 평점은 *영화 자체의 정보*, 우리 평점은 *이 앱 사용자들의
> 평가*다. 화면에 함께 보여준다.

**그때까지의 처리** — 상세 화면의 평점 블록을 **조건부로 숨긴다.** 자리는 잡아두되
`voteAverage`가 없으면 렌더하지 않는다. **플레이스홀더 숫자나 "-"를 넣지 않는다** —
데모에서 실제 값처럼 보인다.

⚠️ **B-4는 화면 작업과 병렬 가능하다.** M2-B 착수를 막지 않으므로, 지금 백엔드에 요청만
넣어두고 화면부터 진행한다.

---

## 7. 검증 절차

> 환경 준비(LAN IP·방화벽·`.env`)는 `M2A-foundation-spec.md` §12-0을 재사용한다.

### 7.1 핵심 동선 완주 — M2-B 완료 판정

**한 번에 끊기지 않고 이어져야 한다.**

```
로그인 → 검색("인터스텔라") → registered 항목 탭 → 상세
  → 시청 기록 저장(날짜+별점) → 뒤로 → MyRecords에 방금 기록이 보인다
```

| # | 확인 | 통과 기준 |
|---|---|---|
| 0 | **앱 실행** | 로그인 화면이 아니라 **홈(게스트)** 에 도달 |
| 1 | 로그인 성공 | **모달이 닫히고 원래 있던 화면이 그대로 남는다** |
| 2 | 검색 2섹션 | `registered` / `suggestions`가 분리돼 보인다 |
| 3 | **미등록 영화 선택** | 로딩 후 상세 진입, 재검색 시 `registered`로 올라온다 |
| 4 | 상세 5개 호출 | 로딩 → 정상 렌더. **비로그인 진입 시 401이 나지 않는다**(`enabled` 확인) |
| 5 | 기록 저장 | 201 후 회차 목록에 추가 |
| 6 | `MyRecords` 반영 | **무효화가 걸려 재조회된다**(수동 새로고침 불필요) |
| 7 | 찜 토글 | 낙관적 업데이트 — 탭 즉시 하트가 바뀐다 |
| 8 | 리뷰 upsert | 두 번 저장해도 **1개만** 남는다 |

### 7.2 경계 케이스

| # | 시나리오 | 기대 |
|---|---|---|
| E-1 | **리뷰 없는 영화 상세** | `GET /api/reviews/me`가 **204** → 에러 화면이 아니라 "리뷰 작성" 상태 |
| E-2 | 검색 결과 0건 | `EmptyState`. 에러 아님 |
| E-3 | TMDB 장애 (`suggestions: []`) | `registered`만 정상 표시. 에러 화면 금지 |
| **G-1** | **게스트로 앱 실행 → 검색 → `registered` 상세** | 끊김 없이 진행. **401이 한 번도 나지 않는다**(`enabled` 확인) |
| **G-2** | 게스트로 `suggestions` 탭 | 로그인 모달 → 로그인 → 모달 닫힘 → **검색 결과 화면 그대로** |
| **G-3** | 게스트로 찜 버튼 탭 | 로그인 모달. 닫으면 상세 화면 그대로 |
| **G-4** | 게스트로 마이페이지 탭 | `<AuthRequired>` — 빈 화면이나 에러가 아니다 |
| **G-5** | **인증 전용 화면에서 로그아웃** (`MyRecords`에서) | 그 자리에서 `<AuthRequired>`로 바뀐다. 튕기거나 크래시하지 않는다 |
| **G-6** | 게스트 상태로 인증 API 강제 호출 | 401이 그대로 `ApiError`로 온다 — **refresh·logout을 시도하지 않는다**(§0.1-5) |
| E-6 | `watchType=OTT` + `ottPlatformId` 없음 | **클라이언트에서 막힌다** (400을 받기 전에) |
| E-7 | 별점 범위 초과 | 클라이언트에서 막힌다 |
| E-8 | 비행기 모드 | `isNetwork: true` → 재시도 버튼. **로그아웃되지 않는다** |
| E-9 | 비밀번호 변경 성공(204) | **로그인 화면으로 이동** |
| E-10 | 무한 스크롤 2페이지 | 중복·건너뜀 없음 (`allPages.length + 1` 확인) |

### 7.3 ★ 동시 401 실전 재확인

M2-A §12 D는 프로브 화면으로 인위적으로 만든 것이었다. **`MovieDetail`이 실제 5개 병렬
호출을 하므로 여기서 다시 확인한다.**

```
1. 백엔드 jwt.access-token-ttl → PT10S        ← 임시
2. 로그인 → 15초 대기
3. MovieDetail 진입
4. 백엔드 로그에서 POST /api/auth/reissue 수신 횟수 = 1
5. 앱이 로그아웃되지 않고 화면이 정상 렌더
6. ⚠️ access-token-ttl → PT30M 복구
```

실패 증상은 **"상세 화면 들어갔더니 로그인 화면으로 튕김"** 이다.

---

## 8. 하지 않을 것 (M2-B 범위 밖)

경계를 명시해 둔다. 여기 손대기 시작하면 M2-B가 안 끝난다.

- **2군 화면** — `Wishlist` · `CollectionList`/`Detail` · `Report` (M2-C)
- **3군 화면** — `Social` · `CineMap` · `Recommend` — **백엔드가 막혀 있다**(상위 §11 B-9~B-11).
  플레이스홀더 그대로 둔다
- **컬렉션에 추가** — `MovieDetail`에 자리만 두고 동작은 M2-C. 컬렉션 목록 화면이 없으면
  선택 시트를 만들 수 없다
- **카카오 로그인 실동작** — 버튼만. prebuild가 필요하다(상위 §11.1).
  `@react-native-kakao/*`를 **`dependencies`에 다시 넣지 않는다**
- **프로필 사진 업로드** — L-13 미결. 되돌리기가 가장 비싸다
- **정렬·필터 UI** — 백엔드가 지원하지 않는다(§5.5)
- **목 어댑터** — 백엔드가 로컬에서 돌므로 지금은 불필요(§2)
- **차트 라이브러리** — 2군에서 설치

---

## 9. M2-C 진입 조건 (참고)

M2-B가 끝나면 2군으로 간다. 미리 알아둘 것.

| 화면 | 상태 |
|---|---|
| `Wishlist` | ✅ API 완비. 바로 가능 |
| `CollectionList`/`Detail` | ✅ API 있음. 단 **컬렉션 단건 조회가 없어**(잔여 #4) 목록에서 받은 값을 넘겨야 하고, **미리보기 포스터 필드도 없다**(B-6 — 없으면 N+1) |
| `Report` | ❌ **B-8 — 백엔드 M3-a 미구현.** 설계는 기획노트 2-4에 완료돼 있으나 API가 없다. 백엔드와 동반 진행 |

**M2-B 도중 발생하는 워크플로 전환** — 카카오 로그인을 실기기에 붙이는 시점(대략 9월 중순)이
`expo prebuild` 분기점이자 실서버 배포 트리거다. **지도 네이티브 SDK와 묶어 판단한다**
(상위 「📍 진행 현황」 · §11.1 · §13).

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-08-31 | **§0.1(게스트 우선 전환) 선행 5건 구현 완료.** `RootNavigator`를 `status` 분기에서 `Main`(항상) + `AuthModal`(`presentation:'modal'`) 구조로 재구성하고 `RootStackParamList`를 `{Main, AuthModal}`로 변경. `src/hooks/useRequireAuth.ts`(액션 게이트)와 `src/components/common/AuthRequired.tsx`(화면 게이트) 신규 추가. `src/api/client.ts` 응답 인터셉터에 게스트 401 가드 추가(`status !== 'authenticated'`면 refresh·logout 없이 그대로 던진다). 이어서 기존 화면 2곳을 새 구조에 맞춰 갱신했다 — `LoginScreen`은 로그인 성공 시 `navigation.goBack()`으로 모달을 닫도록(§6.7에서 유일하게 허용된 수동 navigate), `MyPageScreen`은 `isAuthed`가 아니면 `<AuthRequired>`를 먼저 렌더하도록, `SearchResultScreen`의 suggestions 탭 가드는 막다른 `Alert` 대신 `useRequireAuth()`로 교체해 실제로 로그인 모달을 띄우도록 고쳤다. `npx tsc --noEmit`·`expo export --platform android` 통과 확인. **1군 화면 자체(§1의 4·5번 이후 나머지, `MovieDetail`부터)는 이 작업 다음이다.** |
| 2026-08-31 | **§0(착수 전 정리) 5건 완료.** ① `src/api/movie.ts`·`wishlist.ts`·`collection.ts` 실구현, `record.ts`·`review.ts`·`user.ts` 신규 추가(§2) — `reviews/me`의 204는 `null`로 정규화. ② `src/hooks/` 전 훅을 실 API 연동으로 교체(§3) — 무효화 매트릭스(§3.2), 검색 1-based 페이징(§3.3), 인증 의존 훅(`useWatchLog`·`useMyReview`·`useIsWished`) `enabled` 가드(§3.4) 반영. 진행 중 `useCreateCollection`이 실제 스키마(`CollectionCreateRequest.name`)와 다르게 `title`로 잘못 선언돼 있던 것을 발견해 바로잡았다 — M2-A 단계에서 필드명을 추측한 사례. ③ `useMovies.ts`의 `MovieDetailResponse = unknown`을 `S['MovieDetailResponse']`로 교체, 나머지 훅의 임시 `unknown` 타입도 동일하게 정리. ④ 마지막 훅을 채운 뒤 `src/hooks/_stub.ts` 삭제. ⑤ `git add --renormalize .`로 CRLF 정규화 후 커밋(`81d66d4`) — 단, `CLAUDE.md`·`docs/M2-frontend-spec.md`·`docs/M2A-foundation-spec.md`·`.gitignore`는 이 작업과 무관한 기존 미커밋 변경이 섞여 있어 커밋에서 제외(unstage)했다. `npx tsc --noEmit` 통과 확인. **1군 화면 자체(§1의 4번 이후)는 아직 손대지 않았다.** |
| 2026-08-30 | **게스트 우선 전환 반영 — §0.1 신설 + §1·§3.4·§5·§7 개정.** 검색 화면 구현 중 **스펙의 비로그인 시나리오(E-4·E-5)와 `RootNavigator`의 로그인 게이트가 모순**임이 드러났다 — 비로그인 사용자는 `AuthNavigator`로 보내지므로 검색 화면에 도달조차 못 하는데 스펙은 게스트 동작을 규정하고 있었다. **원인은 내가 백엔드의 `permitAll`을 프론트가 노출하는 것으로 잘못 옮긴 것**이다. 백엔드는 `service-layer-spec.md` 4-6에서 *"비로그인(`viewerId == null`) 조회 허용"* 을 확정했고 `PUBLIC_GET_ENDPOINTS`도 열려 있어 계약 자체는 존재했으나, 프론트 네비게이션과 화해되지 않은 상태였다. **게스트 우선으로 해소하기로 확정**(상위 §6.7) — 비로그인이 기본, 로그인은 선택. **화면 작업보다 먼저 할 선행 5건을 §0.1로 뽑았다**: `RootNavigator` 재구성(`status` 분기 제거 → `Main` + `AuthModal` 모달), `RootStackParamList` 변경, `useRequireAuth()`(액션 게이트), `<AuthRequired>`(화면 게이트), **인터셉터 게스트 가드**. 마지막 것이 특히 중요한데, 게스트는 토큰이 없어 인증 API에서 401을 받는데 현재 인터셉터가 `logout()`과 refresh를 시도해 **무의미한 동작과 낭비**가 생긴다. **`enabled: isAuthed`가 선택에서 필수로 승격**됐다(§3.4) — 게스트가 상세 화면에 들어오는 것만으로 401이 세 번 나기 때문이며, 인터셉터 가드는 훅 하나를 빠뜨렸을 때를 위한 이중 방어다. **로그인 성공 시 동작도 바뀐다** — 스택을 갈아끼우지 않고 **모달만 닫는다.** 검색 도중 찜을 눌러 로그인한 사용자가 있던 자리를 잃지 않게 하기 위함이다. 검증에 게스트 케이스 6건(G-1~G-6)을 추가했고, 그중 **G-5(인증 전용 화면에서 로그아웃)** 는 게스트 우선에서만 생기는 새 경로다. **비용은 늘어난다** — 화면마다 게스트 분기가 하나씩 붙고 선행 부품 2개와 네비게이션 재구성이 추가된다. 대안(로그인 게이트 유지)이 범위상 안전했으나, 백엔드 설계와의 정합과 데모·심사 이점을 근거로 게스트 우선을 택했다 |
| 2026-08-30 | 최초 작성. M2-A 완료 직후, 상위 문서의 「📚 문서 구성」 경계 기준에 따라 **실행·검증만** 담았다(화면 요구사항·API 계약은 상위 §9·§5·§6 참조). **실행 순서를 계층별(가로)로 잡은 이유** — 화면 하나를 끝까지 만드는 방식은 데이터 흐름이 확정되기 전에 레이아웃을 굳혀 나중에 전부 다시 손대게 된다. `api → hooks → 부품 → 화면` 순으로 가고, 첫 화면에서 흐름을 확정한 뒤 복제한다. **로그인을 검색보다 먼저 두었다** — `POST /api/movies/sync`가 인증 필수라 로그인 없이는 검색의 절반을 시험할 수 없고, M2-A의 디버그 프로브를 지웠으므로 인증 상태를 만들 다른 방법이 없다. **구현 시 걸리는 것으로 새로 뽑아낸 것 4건** — ① **`GET /api/reviews/me`의 204를 `null`로 정규화**해야 한다. axios가 204에서 `data`를 빈 문자열로 주므로 그대로 흘리면 **빈 문자열이 `ReviewResponse` 행세를 하며 화면까지 내려간다.** ② **무한스크롤에서 `registered.page`(0-based)와 요청 쿼리 `page`(1-based)를 섞으면** 페이지를 건너뛰거나 중복 로드한다 — `allPages.length + 1`로 계산한다. ③ **`MovieDetail`이 5개 병렬 호출**이라 M2-A §12 D에서 인위적으로 만든 동시 401이 여기서 실제로 발생한다. 인증 의존 훅 3개에 `enabled`를 안 걸면 비로그인 진입만으로 401이 세 번 나고 인터셉터가 로그아웃 경로를 탄다. ④ **`signup`은 `rawPassword`, `login`은 `password`** 로 필드명이 다르다. **백엔드 선행은 B-4 하나**이며 화면 작업과 병렬 가능하므로 착수를 막지 않는다 — 그때까지 평점 블록은 **조건부로 숨기고 플레이스홀더 숫자를 넣지 않는다**(데모에서 실제 값처럼 보인다) |
