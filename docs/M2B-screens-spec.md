# CineMory M2-B — 1군 화면 구현 스펙

> 상위 문서: `docs/M2-frontend-spec.md` — **계약과 사실은 그쪽, 실행과 검증은 여기**
> (분담 기준은 상위 문서의 「📚 문서 구성」)
> 선행 단계: `docs/M2A-foundation-spec.md` (✅ 완료 2026-08-30)
> 대상: `cinemory-app` — **Expo SDK 57 / RN 0.86 / React 19.2** / TypeScript (2026-09-06 업그레이드)

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
| **시청 기록 수정** (B-15) | `['records']` · `['movies','detail',movieId]` · **`['reviews']`** ← ★ |
| 대표 기록 변경 | `['records','ofUserMovie',userId,movieId]` |
| 리뷰 upsert/삭제 | `['reviews','me',movieId]` · `['movies','reviews',movieId]` |

> ★ **기록 수정에 `['reviews']`가 붙는 이유** — 공개 리뷰의 별점이 대표 기록에서 파생되므로
> (상위 §7.3), **대표 기록의 `rating`을 고치면 리뷰에 보이는 별점도 바뀐다.** 무효화하지 않으면
> 화면에 옛 별점이 남는다.
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

### 5.2 `Home` — 2026-09-06 디자인 고도화

**요구사항은 상위 §9.1이 단일 출처다** (배경 소스 분기 표·아웃라인 5겹·60초 루프 등). 여기엔
구현 시 걸린 것만 적는다.

- 컴포넌트 3분할 — `src/components/home/PosterBackdrop.tsx`(① 그리드+루프+소스 분기),
  `src/components/common/OutlinedText.tsx`(② 5겹 아웃라인, 스플래시·로그인 재사용 가능),
  `src/screens/home/HomeScreen.tsx`(③ 조립)
- 소스 분기는 `useHomeBackground` 훅(신규)이 맡는다 — 로그인 + 기록 12편 이상이면
  `useMyRecords`의 첫 페이지, 아니면 `useRandomMovies`(B-17, `GET /api/movies/random`) 폴백.
  ⚠️ **로그인 사용자의 기록이 충분한지 알기 전엔 랜덤을 같이 부르지 않는다** — `enabled`로
  순차 게이팅해서 낭비 호출을 없앴다
- ⚠️ **`useMyRecords`에 `enabled: isAuthed`가 빠져 있던 걸 이번에 발견해 추가했다** — 상위
  §3.4 표에 이미 있던 요구사항인데 구현이 누락돼 있었다. 게스트가 `Home`에 들어오는 것만으로
  `/api/users/0/records`에 불필요한 401 요청이 나가고 있었다(§7.3 로그에서 실제로 관측됨)
- `PosterSize`에 `BACKDROP_TILE: 'w92'` 추가 — blur 없이 업스케일로 뭉개는 용도
  (`expo-blur`는 Android 성능 이슈로 마지막 수단, 상위 §9.1)
- **이 화면만 `Screen` 프리미티브를 쓰지 않는다.** `Screen`의 루트가 `SafeAreaView`라 배경까지
  안전영역 안쪽으로 잘려서 노치 위아래에 여백이 생긴다 — `<View>` 루트 + 배경은 `absolute
  inset-0`로 꽉 채우고, 로고·검색바만 안쪽 `SafeAreaView`로 감싼다
- 검색바는 `TextField` 프리미티브 대신 `TextInput`을 직접 썼다 — 좌측 아이콘·반투명
  배경(`bg-card/90`)·플랫폼별 그림자(`iOS shadow*` / `Android elevation`) 조합이 프리미티브
  범위를 벗어난다

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
| **리뷰** | 모달 → 저장 | `PUT /api/movies/{id}/review` (upsert). ⚠️ **바디는 `{ content }` 뿐** |

⚠️ **기록과 리뷰를 한 폼에 섞지 않는다.** 기록은 회차별 여러 개, 리뷰는 영화당 정확히 1개다
(상위 §5.3). 섞으면 두 번째 관람을 기록할 때 리뷰가 덮인다.

⚠️ **별점 입력은 시청 기록 모달에만 둔다** (상위 §7.3, 2026-09-01 확정). 리뷰 모달은
**텍스트만** 받는다 — `ReviewWriteRequest`가 `{ content }`로 바뀐다. 리뷰 영역에 표시되는
별점은 대표 시청 기록에서 파생된 값이며, `ReviewResponse.rating`이 **nullable**이므로
**null이면 별점을 그리지 않는다**(기록이 없거나 한 번도 별점을 안 매긴 경우).
*"별점은 내 시청 기록의 별점이 함께 표시됩니다"* 안내를 둔다.

**시청 기록 모달**

- `movieId` 외 **전부 선택**이다. `watchDate`도 nullable — *"오래돼서 기억 안 남"* 을 허용한 설계다
- ⚠️ **`watchType === 'OTT'`면 `ottPlatformId` 필수, `THEATER`/`ETC`/`null`이면 있으면 안 된다.**
  위반 시 `INVALID_WATCH_TYPE_OTT_COMBINATION`(400). **클라이언트에서 먼저 막는다**
- 날짜: `@react-native-community/datetimepicker` — Android는 `DateTimePickerAndroid.open()`,
  iOS는 인라인. **플랫폼 분기가 필요하다**
- 회차가 2개 이상이면 목록으로 보여주고 `PATCH /api/records/{id}/representative`로 대표 지정
- **각 회차에 `수정` 진입점을 둔다** — 기록 모달을 **생성/수정 겸용**으로 만든다(초기값만 다르다).
  ✅ **구현 완료(B-15, 2026-09-04)** — `PATCH /api/records/{recordId}` 연동, 상위 §11.2가 설계 확정본이다.
  ⚠️ 수정 저장 성공 시 무효화에 **`['reviews']`를 포함**한다(§3.2)
- ⚠️ **관람일 수정 시 하한 제약** — 더 먼저 본 회차들 중 날짜가 있는 가장 가까운 것보다
  이전 날짜로는 저장할 수 없다(2026-09-04 추가). 목록이 `id DESC`이므로 수정 대상보다
  뒤쪽 원소를 탐색해 날짜 있는 첫 회차를 찾는다 — 인접 원소만 보면 안 된다(그 회차에
  날짜가 없을 수 있다). 날짜 입력에는 **지우기**(null로 되돌리기) 진입점도 필요하다 —
  없으면 잘못 입력한 날짜를 고치려고 기록 전체를 지워야 한다
- 🔖 **백로그 — 회차 더보기 페이지**(사용자 요청, 2026-09-04). 시청 기록이 5개를 넘으면
  상세 화면 카드 안에 전부 나열하기보다 별도 페이지로 분리하는 게 낫다. `getWatchLog`가
  현재 **페이징 없는 배열**이라(상위 §9.3) 구현하려면 백엔드에 페이징 추가를 먼저 확인해야
  할지, 클라이언트에서 이미 받은 배열을 자르기만 하면 될지 착수 시점에 판단한다. M2-B
  범위 밖 — 지금은 진행하지 않는다

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

#### 스크롤 시 툴바 접기 (2026-09-02 추가)

**접는 것은 화면 안 툴바(그리드/리스트 토글)뿐이다. 네이티브 스택 헤더는 건드리지 않는다**
(상위 §9.4 — 플랫폼 뷰라 부드럽게 움직일 수 없다).

**Reanimated를 쓴다.** `reanimated 4.5.1` + `react-native-worklets`가 이미 설치돼 있다
(NativeWind가 worklets를 요구해 들어온 것). `Animated.diffClamp`(RN 내장)를 쓰지 않는 이유:

1. **이 화면은 포스터 그리드라 이미지 디코딩이 JS 스레드를 먹는다.** JS 드리븐 애니메이션은
   **정확히 스크롤하는 그 순간에** 끊긴다. Reanimated는 UI 스레드에서 돌아 영향을 받지 않는다.
2. `diffClamp`는 iOS 바운스(음수 offset)에서 헤더가 중간에 걸린다.
3. 스냅(손을 떼면 완전히 숨김/보임)을 만들기 어렵다.

**동작은 위치 기반이 아니라 방향 기반으로 한다.** 위치 기반(스크롤량 1:1 연동)은 툴바를 다시
보려면 맨 위까지 올라가야 한다.

```
delta > 8  이고 scrollY > TOOLBAR_HEIGHT  →  숨김   withTiming(200)
delta < -8                                →  보임
scrollY <= TOOLBAR_HEIGHT                 →  항상 보임
```

⚠️ **마지막 줄이 짧은 목록을 방어한다.** 없으면 툴바를 숨긴 뒤 되돌릴 스크롤이 없어
**영영 안 보이는 상태**가 된다.

**레이아웃 — `marginTop`을 애니메이션하지 않는다**

와이어프레임은 body의 `marginTop`을 헤더 높이와 동기화했는데, 그러면 **매 프레임 레이아웃이
재계산돼 끊긴다.** 툴바는 `absolute` + `translateY`, 리스트는 `paddingTop` **고정**이다.

```tsx
<View className="flex-1 overflow-hidden">
  <Animated.View style={toolbarStyle}
    className="absolute top-0 left-0 right-0 z-10 bg-background">
    {/* 그리드/리스트 토글 */}
  </Animated.View>

  <Animated.FlatList
    onScroll={onScroll}
    scrollEventThrottle={16}
    contentContainerStyle={{ paddingTop: TOOLBAR_HEIGHT, /* 기존 값 유지 */ }}
  />
</View>
```

**⚠️ 이 화면 특유의 함정 넷**

| # | 함정 | 대응 |
|---|---|---|
| 1 | **`key={viewMode}`로 FlatList가 재생성**된다. 그리드↔리스트 토글 시 스크롤은 0으로 가는데 **툴바 상태는 숨김으로 굳는다** | `useEffect`로 `viewMode` 변경 시 `reset()` |
| 2 | 숨은 툴바가 터치를 먹으면 **목록 상단 항목이 안 눌린다** | `pointerEvents="box-none"` 또는 숨김 상태에서 `none` |
| 3 | 툴바가 컨테이너 위로 삐져나와 네이티브 헤더 영역에 보일 수 있다(iOS `overflow: visible`) | 감싸는 `View`에 **`overflow: hidden`** |
| 4 | `EmptyState`일 때는 스크롤이 없다 | 목록이 비면 **툴바를 고정**한다(접기 비활성) |

**재사용 — 훅으로 뽑는다**

2군의 `Wishlist`·`CollectionDetail`이 같은 형태의 리스트다. 화면에 직접 박으면 세 번 복사하게 된다.

```
src/hooks/useCollapsibleToolbar.ts   →  { onScroll, toolbarStyle, reset }
```

`reset`을 밖으로 노출해야 함정 1을 화면에서 처리할 수 있다.

**검증**

| # | 확인 |
|---|---|
| 1 | 포스터 로딩 중에도 스크롤이 끊기지 않는다 |
| 2 | 조금만 위로 올려도 툴바가 나온다 |
| 3 | **목록이 짧을 때 툴바가 사라지지 않는다** |
| 4 | **그리드↔리스트 토글 후 툴바가 다시 보인다** |
| 5 | 툴바가 숨은 상태에서 목록 상단 항목이 눌린다 |
| 6 | iOS 바운스에서 툴바가 중간에 걸리지 않는다 |

**3·4번이 실제로 자주 깨진다.**

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

## 6. 백엔드 선행 — 1군에 걸리는 것 4건

상위 §11에서 M2-B를 실제로 막는 것은 아래 넷이다. 나머지 1군 API는 완비돼 있다.

| # | 항목 | 화면 영향 | 병렬 가능? |
|---|---|---|---|
| **B-4** | 영화 상세 평점 (`voteAverage` 노출 + `AVG` 집계) | 평점 블록만 숨기면 진행 가능 | ✅ |
| **B-13** | OTT 플랫폼 목록 API | `watchType=OTT` 저장 불가 → **THEATER/ETC만 지원**하고 진행 | ✅ |
| **B-15** | **시청 기록 수정 API** | 수정 진입점을 숨기고 진행. 설계 확정본은 상위 **§11.2** | ✅ |
| **B-16** | `review.rating` 제거 + 파생 | ⚠️ **리뷰 *작성*을 붙이면 400.** 읽기만 먼저 | ⚠️ **작성은 차단** |

**넷 다 화면 작업과 병렬 가능하지만, B-16만 리뷰 저장을 막는다.** 요청을 지금 넣어두고
화면부터 진행한다.

### B-4 상세

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
| **G-5** | **인증 전용 화면에서 로그아웃** (`MyRecords`에서) ⚠️ | 그 자리에서 `<AuthRequired>`로 바뀐다. 튕기거나 크래시하지 않는다 |
| **G-6** | 게스트 상태로 인증 API 강제 호출 | 401이 그대로 `ApiError`로 온다 — **refresh·logout을 시도하지 않는다**(§0.1-5) |
| E-6 | `watchType=OTT` + `ottPlatformId` 없음 | **클라이언트에서 막힌다** (400을 받기 전에) |
| E-7 | 별점 범위 초과 | 클라이언트에서 막힌다 |
| E-8 | 비행기 모드 | `isNetwork: true` → 재시도 버튼. **로그아웃되지 않는다** |
| E-9 | 비밀번호 변경 성공(204) | **로그인 화면으로 이동** |
| E-10 | 무한 스크롤 2페이지 | 중복·건너뜀 없음 (`allPages.length + 1` 확인) |

⚠️ **G-5는 `MyRecords`에서 그대로 재현할 수 없다(2026-09-05, §7.2 검증 중 확인).**
`Settings`가 `MyRecords`의 자식이 아니라 `MyPage`(스택 루트)의 형제라, `MyRecords`에 있는
채로 `Settings`로 가려면 먼저 `MyPage`로 돌아가야 하고 그 순간 네이티브 스택이 `MyRecords`를
언마운트한다 — "인증 전용 화면이 떠 있는 채로 로그아웃"이라는 조합 자체가 지금 구조로는
못 만든다. `Settings` 자신을 대상으로(같은 `isAuthed` 게이트 + 같은 화면 안의 로그아웃
버튼) 검증하는 것으로 대체한다 — 확인하려는 메커니즘(네비게이션 없이 그 자리에서 게이트로
전환)은 동일하다.

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
| 2026-09-10 (이어서) | **히어로 블러 이음매 개선 — 실기기에서 "이음매가 부자연스럽다" 확인.** `expo-blur` 도입 비용(설치 자체는 prebuild 불필요하지만, 진짜 매끄러운 블러엔 결국 마스크 라이브러리가 더 필요하고 Android 성능은 실기기 확인 전엔 장담 못함)을 설명하고, **기존 방식 개선을 먼저 시도**하기로 했다. ① 2단 블러(선명/`blurRadius 30`)를 5단계(`0·5·11·19·28`)로 세분화 — 밴드 위치 계산에 부호 오류가 있어 맨 위 밴드가 엉뚱한(더 아래쪽) 이미지 슬라이스를 보여주던 버그도 같이 잡았다. ② 그라디언트 끝색을 검정(`rgba(0,0,0,0.88)`)에서 **화면 배경색**으로 바꿔, 히어로 블록과 아래 카드 사이 색이 뚝 끊기던 경계를 없앴다 — 사용자가 원한 "포스터와 상세 정보의 자연스러운 결합"은 블러 품질보다 이 색 경계 문제가 더 컸다. ③ 텍스트는 밴드 하단 65%가 아니라 **위쪽 65%**로 옮겨 배경색으로 빠지는 페이드 구간과 안 겹치게 했다. 새 라이브러리 추가 없음. `npx tsc --noEmit`·`expo export --platform android` 통과 |
| 2026-09-10 | **§5.4 `MovieDetail` 히어로 재설계 — 배경 이미지 제거, 화면 폭 대형 포스터 + 하단 블러/그라디언트로 교체(M2-C 실기기 검증 중 사용자 요청).** 기존엔 `posterPath`를 256px 높이 배경으로 흐리게 깔고 그 아래 작은 포스터(112×160) + 제목을 나란히 배치했는데, **배경 이미지 자체를 없애고 포스터를 화면 폭 그대로 크게 키워 히어로로 쓰는** 형태로 바꿨다. 제목·년도·러닝타임은 포스터 하단 42% 밴드(블러 + 검정 그라디언트) 위에 흰 글자로 중앙 배치. **RN엔 알파 마스크가 없어 진짜 점진적(연속) 블러는 못 만든다** — 같은 이미지를 하단 밴드 높이만큼 `overflow: hidden` + 음수 `top`으로 잘라 그 위에 `blurRadius`를 건 두 번째 레이어로 얹고, 3단 그라디언트(`transparent→0.45→0.88`)로 이음매를 가리는 근사치로 처리했다. `expo-blur`(BlurView)는 쓰지 않았다 — 홈 배경 때 이미 "Android 성능 이슈로 마지막 수단"이라고 판단한 전례(§9.1, `M2-frontend-spec.md`)가 있고, 이 화면은 방문 빈도가 훨씬 높아 같은 우려가 더 크게 적용된다. 대신 `<Image blurRadius>`(RN 내장, 이미 이 파일에서 쓰던 방식)와 `LinearGradient`(이미 의존성 있음)만으로 새 라이브러리 추가 없이 구현했다. 히어로 포스터 사이즈는 `PosterSize.HERO`(`w780`, 기존 `BackdropSize.DETAIL`을 대체·제거)로 신설. 부수 변경 — 3열 그리드용 `PosterSize.LIST`를 `w185`→`w342`로 올렸다(그리드 셀 120~140dp가 2~3배 밀도 기기에서 240~420 물리 픽셀을 요구해 기존 값이 업스케일로 흐리게 보였다 — 실기기 화질 확인 후 사용자 요청 반영, `MyRecords`·`Wishlist`·`CollectionDetail`·컬렉션 편집 전부 영향). `npx tsc --noEmit`·`expo export --platform android` 통과. 상세는 `docs/DevLog.md` 2026-09-10 |
| 2026-09-06 (이어서 2) | **§5.2 `Home` 배경 실기기 검증 — 4열이 3열로 보이는 레이아웃 버그 발견·수정.** 애니메이션·검색바 그림자·로그인/로그아웃 크로스페이드·로고 디자인은 전부 정상. ① 포스터 로딩이 느리다는 지적은 백엔드 문제가 아니었다 — `GET /api/movies/random`은 30~40ms로 즉시 응답하고, 지연은 TMDB CDN에서 이미지(`w92`, 5KB)를 내려받는 자체 왕복 시간(~700ms 측정)이라 프론트·백엔드 어느 쪽에서도 줄일 수 없다(이미 최소 크기·최대 20장 중복 없음 상태). ② "4열 그리드인데 포스터는 3열만" — 실제 버그였다. `PosterBackdrop`이 **마지막 열에도 `marginRight: GAP`을 걸어서** 한 행의 실제 너비가 컨테이너보다 정확히 `GAP`만큼 커졌고, RN Yoga가 고정폭 자식의 사소한 초과도 봐주지 않고 4번째 셀을 다음 줄로 밀어내 3열처럼 보였다. 마지막 열엔 `marginRight: 0`으로 수정. `tsc --noEmit` 통과. 상세는 `docs/DevLog.md` 2026-09-06 "이어서 2" 항목 |
| 2026-09-06 (이어서) | **§5.2 `Home` 디자인 고도화 구현 — M2-B 완료 이후 사용자 요청.** 상위 §9.1(2026-09-06 신설)을 따라 3개 파일로 분할 구현 — `PosterBackdrop`(배경 그리드+60초 루프+소스 분기) · `OutlinedText`(5겹 아웃라인, 공용 컴포넌트로 승격) · `HomeScreen`(조립). 소스 분기용 `useHomeBackground` 훅과 `B-17`(`GET /api/movies/random`) 연동용 `useRandomMovies` 훅을 신규 추가했고, 백엔드에 이미 구현돼 있던 `/api/movies/random`을 확인해(`npm run gen:api`로 타입 재생성, 39줄 추가) 붙였다. **구현 중 §3.4 위반 1건 발견** — `useMyRecords`에 `enabled: isAuthed`가 누락돼 있어 게스트가 어떤 화면에서든 이 훅을 타면 불필요한 401 요청이 나가고 있었다(§7.3 로그의 `GET /api/users/0/records` 404가 실은 이 버그의 증거였다 — 당시엔 대수롭지 않게 넘겼다). 추가하며 수정. `Home`은 스펙 지시대로 `Screen` 프리미티브를 쓰지 않고 `<View>` + 안쪽 `SafeAreaView`로 직접 구성해 배경이 노치까지 꽉 차게 했다. `npx tsc --noEmit` 통과. **실기기 검증 전이다** — 애니메이션 부드러움·크로스페이드·안전영역 처짐 여부는 번들 확인만으로는 알 수 없다 |
| 2026-09-06 | **§7.3 동시 401 실전 재확인 — 통과. M2-B 검증 완료.** `access-token-ttl`을 `PT10S`로 임시 낮추고, 백엔드가 기본으로는 요청을 콘솔에 안 남겨서(access log 없음) `DispatcherServlet` DEBUG 로깅을 같이 켜 `reissue` 수신 횟수를 직접 셌다(백엔드도 Claude Code가 배경 기동해 콘솔을 직접 관찰 — 사용자가 로그를 읽어 전달할 필요 없었다). `MovieDetail` 진입 시 5개 병렬 호출이 11ms 창 안에 전부 발사됐고 그 직전 `reissue`가 정확히 1회만 발생, 5개 전부 200/204로 성공했다. `REFRESH_TOKEN_REUSED`·로그아웃 흔적 없음. 세션 전체로는 `reissue`가 5회 찍혔지만 전부 **서로 다른 시점의 독립된 요청 묶음**이 각자 한 번씩 트리거한 것이었다(`access-token-ttl=10s`가 60초 선제 갱신 버퍼보다 짧아 발급 직후부터 항상 "곧 만료" 조건을 만족하는 테스트 환경의 특성) — 같은 배치 안에서 중복 갱신된 사례는 없었다. 검증 직후 `application.yml`을 원상 복구(`git diff` 무변경 확인)했다. **§1(0~10번)·§7.1·§7.2·§7.3 전부 통과로 M2-B 완료.** 상세는 `docs/DevLog.md` 2026-09-06 항목 |
| 2026-09-05 | **§7.2 경계 케이스 진행 중 — 무한스크롤 풋터 점프 버그 발견·수정, G-5 재해석.** E-10(무한스크롤) 검증 중 "스크롤하면 화면이 순간적으로 튐"이라는 실기기 피드백을 받고 처음엔 페이지네이션 데이터 버그(항목 건너뜀)를 의심했으나, 백엔드 curl 직접 대조(겹치는 id 없음)와 사용자 확인(동시 sync 없이 스크롤만 함)으로 데이터 문제가 아님을 좁혔다. 실제 원인은 `SearchResultScreen`·`MyRecordsScreen` 둘 다 `ListFooterComponent={isFetchingNextPage ? <LoadingState /> : null}` 패턴이라, 페이지를 불러올 때마다 로딩 풋터가 통째로 마운트/언마운트되며 콘텐츠 높이가 출렁인 것 — 사용자가 본 "튐"과 정확히 일치했다. `src/components/common/InfiniteScrollFooter.tsx` 신규 — `hasNextPage`인 동안 항상 같은 높이를 차지하고 그 안에서 스피너만 켜고 꺼서 높이 변화를 리스트 끝 한 번으로 줄였다. 두 화면 모두 교체, `tsc --noEmit` 통과. 같은 세션에서 **G-5도 재해석** — `MyRecords`에 있는 채로 `Settings`(로그아웃 버튼 위치)로 갈 수 없는 스택 토폴로지를 사용자가 지적해 확인, `Settings` 자신을 대상으로 검증하는 것으로 대체(§7.2 표에 반영). 상세는 `docs/DevLog.md` 2026-09-05 "이어서 2" 항목. **§7.3은 사용자 요청으로 이번엔 보류** |
| 2026-09-05 | **§7.1 핵심 동선 완주 — M2-B 완료 판정 기준 충족.** 앱 재시작 없이 0번(게스트 홈)~8번(리뷰 upsert 중복 없음)을 한 번에 이어서 검증, 전 항목 1차 통과. 검증 중 공용 컴포넌트 버그 1건 발견 — `src/components/primitives/TextField.tsx`가 `multiline` 여부와 무관하게 고정 `h-12`(48px)를 걸어서 `ReviewModal`(리뷰, `numberOfLines=6`)과 `WatchRecordModal`(메모, `numberOfLines=3`) 둘 다 입력칸이 48px로 눌려 있었다. `multiline`이면 `numberOfLines` 기반 `minHeight`를 쓰도록 수정(단일 줄 입력은 회귀 없음). 상세는 `docs/DevLog.md` 2026-09-05 "이어서" 항목. **§7.2(경계 케이스)·§7.3(동시 401 재확인)은 아직 남아 있다** |
| 2026-09-05 | **`MyPage`/`Settings`(§5.6, §1 9번, M2-B 마지막 화면) 실기기 검증 — 전 항목 통과, 인터셉터 버그 1건 발견·수정.** 닉네임 변경(빈 값·31자·무변경 disabled 포함)·공개범위 변경·로그아웃·메뉴 이동은 1차 시도에 통과. **비밀번호 변경 검증 중 발견** — 현재 비밀번호를 틀리면 폼 에러 대신 강제 로그아웃(성공 시나리오와 동일한 결과)이 나갔다. 원인은 화면 코드가 아니라 `src/api/client.ts`의 401 인터셉터 — `PATCH /api/users/me/password`가 반환하는 `401 INVALID_CREDENTIALS`(비즈니스 401, 토큰 문제 아님)를 세션 무효로 오판해 로그아웃시켰다. 상위 문서 §6.3의 에러 코드 표와 **정반대로 구현돼 있던 버그**였다 — 지금까지는 인증된 요청 안에서 비즈니스 401을 반환하는 엔드포인트가 없어서 드러나지 않았다. `SESSION_INVALID_CODES` 허용목록으로 뒤집어 수정(상세 근거는 상위 §6.3 변경 이력과 `docs/DevLog.md` 2026-09-05 참고). 재검증 결과 10개 항목 전부 통과 |
| 2026-09-05 | **`MyPage`/`Settings`(§5.6, §1 9번) 구현.** `MyPageScreen`을 로그아웃 검증용 임시 화면에서 본구현으로 교체 — 커버 그라데이션 + 프로필 이미지(카카오 URL 없으면 아이콘 폴백) + 닉네임 + "N편 관람"(`UserProfileResponse`에 없어 `GET /api/users/{myId}/records?size=1`의 `totalElements`로 대체, `useMyRecordsCount` 신규 훅) + 메뉴 6개. `Settings`를 플레이스홀더에서 실제 화면으로 교체 — 닉네임 변경(max 30) · 공개범위 변경(`ActionSheet`) · 비밀번호 변경(react-hook-form + zod) · 로그아웃. 비밀번호 변경 성공 시 `authStore.logout()` 후 `AuthRequired`와 같은 방식으로 `AuthModal`의 `Login`으로 직접 보낸다(일반 로그아웃과 달리 명시적 이동이 필요 — 본문 §5.6 근거). `EditProfile`은 본문이 구체적으로 규정한 게 없어 플레이스홀더로 남겼다. `npx tsc --noEmit` 통과 확인 |
| 2026-09-04 | **"스크롤 시 툴바 접기"(§5.5) 구현.** `src/hooks/useCollapsibleToolbar.ts` 신규 — `Reanimated`의 `useAnimatedScrollHandler`/`useSharedValue`/`useAnimatedStyle`/`withTiming`으로 방향 기반 접기(`{onScroll, toolbarStyle, reset}`)를 구현했다. `babel-preset-expo`가 `react-native-worklets` 설치를 감지해 워클릿 babel 플러그인을 자동으로 넣어준다는 것을 소스로 확인해 `babel.config.js`는 손대지 않았다. `MyRecordsScreen.tsx`에 통합 — 툴바를 `Animated.View`(`absolute` + `translateY`, 고정 높이 44)로, 리스트를 `Animated.FlatList`로 바꾸고 `contentContainerStyle.paddingTop`을 툴바 높이로 고정(`marginTop` 애니메이션 금지 원칙 준수). 스펙이 짚은 함정 4개 전부 반영 — ① 그리드↔리스트 토글 시 `useEffect`로 `reset()` 호출 ② 툴바에 `pointerEvents="box-none"` ③ 감싸는 `View`에 `overflow-hidden` ④ 목록이 비면 `EmptyState`만 렌더해 `onScroll`이 아예 안 붙으므로 툴바가 자연히 고정된다(별도 분기 불필요). `npx tsc --noEmit`·`expo export` 통과 확인. **실기기 검증 전이다 — 스크롤 끊김·바운스 동작·토글 후 복귀는 번들 확인만으로는 알 수 없다** |
| 2026-09-04 | **`MyRecords` 그리드 UI 조정 — 실기기 피드백.** ① `MovieGridItem`에서 포스터 아래 제목 텍스트 제거(포스터만 표시, 접근성 라벨로만 `title` 유지). ② 그리드 열 사이 간격을 `spacing.sm`(8)에서 2로 줄이고, **그리드 모드일 때만** 화면 좌우 여백도 0으로 없애 포스터가 화면을 꽉 채우도록 했다(리스트 모드는 기존 여백 유지 — 텍스트 가독성 때문에). `npx tsc --noEmit`·`expo export` 통과 확인 |
| 2026-09-04 | **`MyRecords`(§5.5, §1 8번) 구현.** `<AuthRequired>` 화면 게이트, `useMyRecords(userId)`(§0에서 이미 구현된 무한스크롤 훅) 연동. `src/components/movie/MovieGridItem.tsx` 신규(§4의 3열 그리드 셀) — 열 폭은 `useWindowDimensions()`로 계산해 호출부가 넘긴다. 그리드/리스트 토글은 `FlatList`의 `numColumns`을 바꿔야 해서 `key={viewMode}`로 강제 리마운트시켰다. 정렬·필터 UI는 스펙대로 넣지 않았다(5-0-D). `MyPageStack.tsx`의 `MyRecords`·`MovieDetail` 플레이스홀더를 실제 화면으로 교체 — `MovieDetail`은 `HomeStack`과 같은 컴포넌트를 공유한다(라우트 파라미터 모양이 동일). `MyPageScreen.tsx`에 "내 기록" 진입점 추가 — 진입점이 없으면 방금 만든 화면을 실기기에서 볼 방법이 없어서(Home/MyPage 때와 같은 패턴). `npx tsc --noEmit`·`expo export` 통과 확인. **실기기 검증 전이다** — 특히 7번(MovieDetail)에서 저장한 기록이 여기 반영되는지(§7.1 6번)가 M2-B 완료 판정의 핵심 동선이다 |
| 2026-09-04 | **§5.4 문서 정리 + 백로그 1건 추가.** MovieDetail 실기기 검증이 §5.4의 "수정 진입점 — 미구현(B-15)" 문구와 어긋나 있어(B-15는 이미 해소돼 구현 완료) 갱신했다. 겸사겸사 날짜 하한 제약(같은 날 추가된 기능)도 §5.4 본문에 반영. **백로그 신설** — 시청 기록이 5개를 넘으면 상세 화면 카드 안에 전부 나열하기보다 별도 "더보기" 페이지로 분리하자는 요청(사용자, 2026-09-04). `getWatchLog`가 페이징 없는 배열이라 백엔드 페이징 추가 여부부터 착수 시점에 판단해야 한다 — M2-B 범위 밖, 지금은 진행하지 않는다 |
| 2026-09-04 | **날짜 하한 제약 수정 2건 — 실기기 피드백 반영.** ① **"이전 회차" 판정을 배열 인접 원소에서 탐색으로 변경** — 전날 구현은 수정 대상 바로 다음 원소만 봤는데, 요청은 "날짜 있는 회차가 이전 전체에 있으면 그걸 반영"이었다. `records.slice(index + 1).find(r => r.watchDate != null)`로 고쳐 날짜 없는 회차는 건너뛰고 더 먼저 본 회차들 중 날짜가 있는 가장 가까운 것을 찾는다. ② **관람일 지우기 버튼 추가** — 날짜를 잘못 입력했을 때 기록 전체를 삭제하지 않고도 "기억나지 않아요" 상태로 되돌릴 방법이 없었다. `WatchRecordModal.tsx`의 날짜 필드 옆에 `watchDate`가 있을 때만 보이는 "지우기"를 추가해 `setWatchDate(null)`로 되돌린다. `npx tsc --noEmit`·`expo export` 통과 확인 |
| 2026-09-04 | **시청 기록 수정에 날짜 하한 제약 추가.** 실기기에서 수정 기능 정상 확인 후 요청받은 소기능 — 관람일을 고칠 때 **이전 회차(더 먼저 본 회차)의 날짜보다 앞선 날짜는 선택·저장할 수 없다.** 이전 회차의 날짜가 없으면 제약 없음. "이전 회차"는 `getWatchLog`가 `id DESC`(최신 생성 순)로 반환하므로(`cinemory-backend/docs/service-layer-spec.md` 4-6-E) 배열상 수정 대상 바로 다음 원소로 판단했다 — 날짜 기준으로 가장 가까운 걸 찾는 게 아니라 **그 특정 다음 회차**만 본다(요청 문구가 "그 회차에 날짜가 없으면 제약 없음"이라고 해 탐색이 아닌 고정 위치 참조로 해석). `WatchRecordModal.tsx`에 `minDate` prop 추가 — Android/iOS 피커의 `minimumDate`로 1차 방어, 제출 시 재검증으로 2차 방어. `MovieDetailScreen.tsx`의 "수정" 액션에서 이전 회차를 찾아 넘긴다. `npx tsc --noEmit`·`expo export` 통과 확인. **"이전 회차"의 해석(배열 인접 vs 날짜 기준 탐색)은 확인 없이 진행한 판단이라 실기기 검증 시 의도와 맞는지 봐야 한다** |
| 2026-09-04 | **B-15 해소 — 시청 기록 수정 기능 구현.** 백엔드가 `PATCH /api/records/{recordId}`를 완료했다는 보고를 받고 `npm run gen:api`로 확인(`WatchRecordUpdateRequest` 확인 — 전체 치환, `movieId`·`representative` 제외). `src/api/record.ts`에 `update()`, `src/hooks/useRecords.ts`에 `useUpdateRecord()`(§3.2 매트릭스 그대로 `['records']`·`['movies','detail',movieId]`·`['reviews']` 무효화) 추가. `WatchRecordModal.tsx`가 `editing?: WatchRecordResponse` prop을 받아 생성/수정 겸용이 되도록 재구성 — 열릴 때 기존 값으로 채우고, 저장 시 폼의 전체 상태를 그대로 보낸다(전체 치환이라 일부만 보내면 나머지가 null로 지워지므로). 시청 기록 문자열→Date 파싱도 로컬 타임존 기준으로 하는 `parseLocalDateString()`을 추가해 이전에 고친 날짜 밀림 버그와 대칭을 맞췄다. `MovieDetailScreen.tsx`의 기록 ActionSheet에 "수정" 옵션 추가(대표 지정·삭제 옵션 앞). `npx tsc --noEmit`·`expo export` 통과 확인. **실기기 검증 전이다** |
| 2026-09-04 | **실기기 재검증(게스트 잠금·별점 없는 리뷰 저장) 통과, 이어서 발견 2건 처리.** ① 시청 기록 목록에 `placeDetail`·`note`가 아예 표시되지 않고 있었다 — `MovieDetailScreen.tsx`에서 `placeDetail`은 관람 방식 옆에, `note`는 기록 정보 줄과 별점 사이에 표시하도록 추가. ② **시청 기록 수정 기능이 없다는 것을 발견** — 확인해보니 백엔드에 애초에 update API가 없다(`POST`·`DELETE`·대표 지정 `PATCH`뿐). 삭제 후 재생성하는 우회안은 대표 자동 승격 부작용(§7.3) 때문에 채택하지 않기로 하고, `docs/M2-frontend-spec.md` §11에 **B-15**로 등록 후 지금은 보류(사용자 결정) — 백엔드에 `PATCH /api/records/{recordId}` 신설을 요청한다. `npx tsc --noEmit` 통과 확인 |
| 2026-09-02 | **§5.4 기획 변경분 반영.** 사용자가 M2B-screens-spec.md §5.4를 게스트 잠금 모델·별점 단일 출처(`watch_record.rating`)로 수정한 데 맞춰 코드를 고쳤다. `ReviewWriteRequest`에서 `rating`이 빠지는 변경은 백엔드 반영을 먼저 확인했다 — 백엔드가 이미 구현했음을 확인 후 `npm run gen:api`로 `api.d.ts` 재생성(`ReviewWriteRequest.rating` 필드 삭제 확인, 2줄 diff). ① `ReviewModal.tsx`에서 별점 입력을 완전히 제거하고 `{content}`만 전송, "별점은 내 시청 기록의 별점이 함께 표시됩니다" 안내를 추가했다. ② `MovieDetailScreen.tsx`의 "내 기록" 카드를 재구성 — 찜 버튼(하트)은 게스트에게도 항상 보이되 탭 시 `useRequireAuth()`가 모달을 띄우고, 그 외(컬렉션·시청 기록·리뷰)는 게스트에게 섹션별 개별 안내 대신 카드 전체를 "기록하려면 로그인하세요" 한 문구로 잠근다. ③ 공개 리뷰 카드에서 `review.rating`이 `null`이면 `RatingStars`를 아예 렌더하지 않도록 수정(기존엔 `?? 0`으로 채워 빈 별을 그렸다 — 스펙의 "null이면 별점 영역을 생략한다"에 위배). `npx tsc --noEmit`·`expo export` 통과 확인. **아직 실기기 재검증 전이다** — 특히 게스트로 상세 진입 시 카드 잠금 문구, 리뷰 작성 시 별점 없이 저장되는지 확인 필요 |
| 2026-09-01 | **`MovieDetail` 실기기 검증 중 버그 2건 발견·수정.** ① 시청 기록 모달의 날짜 선택이 하루 밀리는 버그 — `watchDate.toISOString().slice(0,10)`이 UTC로 변환 후 자르는데, KST(UTC+9)에서 자정 근처 날짜를 고르면 하루 전으로 밀린다(8/3 선택 → 8/2 저장). `getFullYear`/`getMonth`/`getDate`로 로컬 날짜를 직접 포맷하는 `toLocalDateString()`으로 교체(표시·저장 페이로드 공용). ② 설치된 `@react-native-community/datetimepicker@9.1.0`에서 `onChange`가 deprecated였다 — Android `DateTimePickerAndroid.open()`·iOS 인라인 둘 다 `onValueChange`로 교체. `npx tsc --noEmit`·`expo export` 재확인. 나머지 검증 항목(찜 토글·리뷰 upsert·리뷰 없음(204) 상태·대표 기록 지정·비로그인 상세 진입·OTT 저장 차단)은 실기기에서 정상 확인됨 |
| 2026-09-01 | **§7.3 동시 401 실기기 검증 통과.** `jwt.access-token-ttl`을 `PT10S`로 낮추고 백엔드를 `--logging.level.org.springframework.web=DEBUG`로 띄워 `DispatcherServlet`의 요청 로그로 `POST /api/auth/reissue` 수신 횟수를 확인했다. 세션 전체로는 4번 찍혔는데(화면 전환마다 독립적으로 갱신 — TTL이 워낙 짧아 예상된 동작), **`MovieDetail` 진입(5개 병렬 호출) 시점 한 번만 떼어보면 정확히 1줄**이었고 바로 뒤 `Mapped to`/`Read` 로그도 그 요청 하나에 대한 것뿐이었다 — 단일 비행 재발급이 의도대로 작동함을 확인했다. 화면도 로그인 화면으로 튕기지 않고 정상 렌더됐다. TTL은 `PT30M`으로 복구 완료 |
| 2026-08-31 | **`MovieDetail`(§5.4, §1 7번) 구현.** 5개 병렬 호출(`useMovieDetail`·`useWatchLog`·`useMyReview`·`useIsWished`·`useMovieReviews` — 마지막은 신규 훅) 연동, 내 기록 카드를 찜(낙관적 토글)·컬렉션(자리만, M2-C)·시청 기록·리뷰 4개 액션으로 분리(§9.3). `src/components/movie/RatingStars.tsx`(§4.1, 반개 단위 입력 + 동일 별 재탭 시 해제)·`src/utils/rating.ts`(`apiToStars`/`starsToApi`) 신규. `src/screens/movie/WatchRecordModal.tsx`·`ReviewModal.tsx` 분리 구현 — 기록과 리뷰를 한 폼에 섞지 않았다. 회차 2개 이상일 때 대표 지정을 위해 `recordApi.setRepresentative`·`useSetRepresentative` 훅을 새로 추가(§3.2 무효화 매트릭스의 `['records','ofUserMovie',userId,movieId]`만 무효화). 게스트 액션은 `useRequireAuth()`로 게이트. `npx expo install @react-native-community/datetimepicker` 설치 — Android는 `DateTimePickerAndroid.open()`, iOS는 인라인으로 플랫폼 분기. **B-4(평점) 외에 새로 발견한 백엔드 갭 2건**을 §11에 추가할 필요가 있다 — ① **OTT 플랫폼 목록 조회 API가 없다.** `WatchRecordCreateRequest.ottPlatformId`가 필수인데 유효한 ID를 얻을 방법이 없어, 지금은 `watchType=OTT` 선택 시 저장을 막고 안내만 띄운다(THEATER/ETC만 동작). ② `MovieDetailResponse`에 `backdropPath`가 없다 — 히어로 배경은 `posterPath`로 대신했다. `npx tsc --noEmit`·`expo export --platform android` 통과 확인. **실기기 검증 전이다 — 특히 동시 401 실경로(§7.3)와 회차 대표 지정 흐름을 확인해야 한다.** |
| 2026-08-31 | **§0.1(게스트 우선 전환) 선행 5건 구현 완료.** `RootNavigator`를 `status` 분기에서 `Main`(항상) + `AuthModal`(`presentation:'modal'`) 구조로 재구성하고 `RootStackParamList`를 `{Main, AuthModal}`로 변경. `src/hooks/useRequireAuth.ts`(액션 게이트)와 `src/components/common/AuthRequired.tsx`(화면 게이트) 신규 추가. `src/api/client.ts` 응답 인터셉터에 게스트 401 가드 추가(`status !== 'authenticated'`면 refresh·logout 없이 그대로 던진다). 이어서 기존 화면 2곳을 새 구조에 맞춰 갱신했다 — `LoginScreen`은 로그인 성공 시 `navigation.goBack()`으로 모달을 닫도록(§6.7에서 유일하게 허용된 수동 navigate), `MyPageScreen`은 `isAuthed`가 아니면 `<AuthRequired>`를 먼저 렌더하도록, `SearchResultScreen`의 suggestions 탭 가드는 막다른 `Alert` 대신 `useRequireAuth()`로 교체해 실제로 로그인 모달을 띄우도록 고쳤다. `npx tsc --noEmit`·`expo export --platform android` 통과 확인. **1군 화면 자체(§1의 4·5번 이후 나머지, `MovieDetail`부터)는 이 작업 다음이다.** |
| 2026-08-31 | **§0(착수 전 정리) 5건 완료.** ① `src/api/movie.ts`·`wishlist.ts`·`collection.ts` 실구현, `record.ts`·`review.ts`·`user.ts` 신규 추가(§2) — `reviews/me`의 204는 `null`로 정규화. ② `src/hooks/` 전 훅을 실 API 연동으로 교체(§3) — 무효화 매트릭스(§3.2), 검색 1-based 페이징(§3.3), 인증 의존 훅(`useWatchLog`·`useMyReview`·`useIsWished`) `enabled` 가드(§3.4) 반영. 진행 중 `useCreateCollection`이 실제 스키마(`CollectionCreateRequest.name`)와 다르게 `title`로 잘못 선언돼 있던 것을 발견해 바로잡았다 — M2-A 단계에서 필드명을 추측한 사례. ③ `useMovies.ts`의 `MovieDetailResponse = unknown`을 `S['MovieDetailResponse']`로 교체, 나머지 훅의 임시 `unknown` 타입도 동일하게 정리. ④ 마지막 훅을 채운 뒤 `src/hooks/_stub.ts` 삭제. ⑤ `git add --renormalize .`로 CRLF 정규화 후 커밋(`81d66d4`) — 단, `CLAUDE.md`·`docs/M2-frontend-spec.md`·`docs/M2A-foundation-spec.md`·`.gitignore`는 이 작업과 무관한 기존 미커밋 변경이 섞여 있어 커밋에서 제외(unstage)했다. `npx tsc --noEmit` 통과 확인. **1군 화면 자체(§1의 4번 이후)는 아직 손대지 않았다.** |
| 2026-09-01 | **B-15(시청 기록 수정) 반영 — §3.2·§5.4·§6.** 상세 화면 사용 중 **잘못 입력한 기록을 고칠 방법이 없다**는 것이 드러났다. 설계 확정본은 상위 §11.2에 두고 여기에는 화면 쪽 귀결만 적었다 — 기록 모달을 **생성/수정 겸용**으로 만들고(초기값만 다르다) 회차 목록의 각 항목에 수정 진입점을 둔다. **무효화 매트릭스에 `['reviews']`가 추가된 것이 핵심이다** — §7.3 확정으로 공개 리뷰의 별점이 대표 기록에서 파생되므로 **대표 기록의 `rating`을 고치면 리뷰 별점도 바뀌는데**, 무효화하지 않으면 화면에 옛 별점이 남는다. 조용히 틀리는 유형이라 표에 ★로 표시했다. 함께 **§6을 "B-4 하나뿐"에서 4건(B-4·B-13·B-15·B-16)으로 갱신**했다 — Claude Code가 구현 중 B-13·B-14를 추가하고 내가 B-15·B-16을 확정하는 동안 이 절이 낡아 있었다. **넷 중 B-16만 병렬 불가**(리뷰 작성을 붙이면 400)라는 구분을 명시했다 |
| 2026-09-02 | **§5.5에 스크롤 시 툴바 접기 추가.** 상위 §9.4의 *"M2에서 생략"* 결정을 되돌린 것이다 — 실기기 사용 중 그리드/리스트 툴바가 목록 상단을 계속 차지한다는 요구가 나왔다. **접는 대상을 툴바로 한정**했다(네이티브 헤더는 플랫폼 뷰라 부드럽게 못 움직인다 — 상위 §9.4). **`Animated.diffClamp`가 아니라 Reanimated를 쓰는 이유를 명시**했다: 이 화면은 포스터 그리드라 **이미지 디코딩이 JS 스레드를 먹어 JS 드리븐 애니메이션이 정확히 스크롤하는 순간에 끊긴다.** UI 스레드 실행이 여기서 결정적이다. **동작을 위치 기반이 아니라 방향 기반으로** 정한 것은 위치 기반이면 툴바를 다시 보려고 맨 위까지 올라가야 하기 때문이고, `scrollY <= TOOLBAR_HEIGHT`면 항상 보이게 한 것은 **짧은 목록에서 툴바가 영영 안 보이는 상태**를 막기 위해서다. ⚠️ **`marginTop`을 애니메이션하지 말 것**을 못박았다 — 와이어프레임이 그렇게 했는데 매 프레임 레이아웃이 재계산돼 끊긴다(`translateY` + 고정 `paddingTop`이 정답). 함정 넷 중 **①(`key={viewMode}` 재생성 시 툴바가 숨김으로 굳음)과 ④(빈 목록)** 가 실제로 자주 깨지는 지점이라 검증 항목에도 넣었다. 2군의 `Wishlist`·`CollectionDetail`이 같은 형태라 **`useCollapsibleToolbar` 훅으로 뽑도록** 했다 |
| 2026-09-01 | **별점 단일 출처 확정 반영 (§5.4).** 상위 §7.3 확정에 따라 **리뷰 작성 모달에서 별점 입력을 제거**하고 텍스트만 받는다(`ReviewWriteRequest` → `{ content }`). 별점 입력은 시청 기록 모달에만 남는다. 리뷰 영역에 보이는 별점은 **대표 시청 기록에서 파생된 표시 전용 값**이며 `ReviewResponse.rating`이 nullable이므로 **null이면 별점을 그리지 않는다.** 앞서 이 문제를 *"M2-B에서 리뷰 작성을 제거하자"* 로 해소하려던 안은 **철회했다** — 별점 모호성이 파생 방식으로 해소되므로 리뷰 작성을 뺄 이유가 없어졌고, 공개 리뷰 목록 유지(댓글 대상·소셜 설계 보존) 결정과도 맞는다. **백엔드 선행 작업 7건이 붙는다** — 완료 전까지 리뷰 작성 UI는 별점 없이 만들되 `PUT`은 기존 계약(`{rating, content}`)을 따라야 하므로, **백엔드 반영 후에 리뷰 저장을 붙인다** |
| 2026-08-30 | **게스트 우선 전환 반영 — §0.1 신설 + §1·§3.4·§5·§7 개정.** 검색 화면 구현 중 **스펙의 비로그인 시나리오(E-4·E-5)와 `RootNavigator`의 로그인 게이트가 모순**임이 드러났다 — 비로그인 사용자는 `AuthNavigator`로 보내지므로 검색 화면에 도달조차 못 하는데 스펙은 게스트 동작을 규정하고 있었다. **원인은 내가 백엔드의 `permitAll`을 프론트가 노출하는 것으로 잘못 옮긴 것**이다. 백엔드는 `service-layer-spec.md` 4-6에서 *"비로그인(`viewerId == null`) 조회 허용"* 을 확정했고 `PUBLIC_GET_ENDPOINTS`도 열려 있어 계약 자체는 존재했으나, 프론트 네비게이션과 화해되지 않은 상태였다. **게스트 우선으로 해소하기로 확정**(상위 §6.7) — 비로그인이 기본, 로그인은 선택. **화면 작업보다 먼저 할 선행 5건을 §0.1로 뽑았다**: `RootNavigator` 재구성(`status` 분기 제거 → `Main` + `AuthModal` 모달), `RootStackParamList` 변경, `useRequireAuth()`(액션 게이트), `<AuthRequired>`(화면 게이트), **인터셉터 게스트 가드**. 마지막 것이 특히 중요한데, 게스트는 토큰이 없어 인증 API에서 401을 받는데 현재 인터셉터가 `logout()`과 refresh를 시도해 **무의미한 동작과 낭비**가 생긴다. **`enabled: isAuthed`가 선택에서 필수로 승격**됐다(§3.4) — 게스트가 상세 화면에 들어오는 것만으로 401이 세 번 나기 때문이며, 인터셉터 가드는 훅 하나를 빠뜨렸을 때를 위한 이중 방어다. **로그인 성공 시 동작도 바뀐다** — 스택을 갈아끼우지 않고 **모달만 닫는다.** 검색 도중 찜을 눌러 로그인한 사용자가 있던 자리를 잃지 않게 하기 위함이다. 검증에 게스트 케이스 6건(G-1~G-6)을 추가했고, 그중 **G-5(인증 전용 화면에서 로그아웃)** 는 게스트 우선에서만 생기는 새 경로다. **비용은 늘어난다** — 화면마다 게스트 분기가 하나씩 붙고 선행 부품 2개와 네비게이션 재구성이 추가된다. 대안(로그인 게이트 유지)이 범위상 안전했으나, 백엔드 설계와의 정합과 데모·심사 이점을 근거로 게스트 우선을 택했다 |
| 2026-08-30 | 최초 작성. M2-A 완료 직후, 상위 문서의 「📚 문서 구성」 경계 기준에 따라 **실행·검증만** 담았다(화면 요구사항·API 계약은 상위 §9·§5·§6 참조). **실행 순서를 계층별(가로)로 잡은 이유** — 화면 하나를 끝까지 만드는 방식은 데이터 흐름이 확정되기 전에 레이아웃을 굳혀 나중에 전부 다시 손대게 된다. `api → hooks → 부품 → 화면` 순으로 가고, 첫 화면에서 흐름을 확정한 뒤 복제한다. **로그인을 검색보다 먼저 두었다** — `POST /api/movies/sync`가 인증 필수라 로그인 없이는 검색의 절반을 시험할 수 없고, M2-A의 디버그 프로브를 지웠으므로 인증 상태를 만들 다른 방법이 없다. **구현 시 걸리는 것으로 새로 뽑아낸 것 4건** — ① **`GET /api/reviews/me`의 204를 `null`로 정규화**해야 한다. axios가 204에서 `data`를 빈 문자열로 주므로 그대로 흘리면 **빈 문자열이 `ReviewResponse` 행세를 하며 화면까지 내려간다.** ② **무한스크롤에서 `registered.page`(0-based)와 요청 쿼리 `page`(1-based)를 섞으면** 페이지를 건너뛰거나 중복 로드한다 — `allPages.length + 1`로 계산한다. ③ **`MovieDetail`이 5개 병렬 호출**이라 M2-A §12 D에서 인위적으로 만든 동시 401이 여기서 실제로 발생한다. 인증 의존 훅 3개에 `enabled`를 안 걸면 비로그인 진입만으로 401이 세 번 나고 인터셉터가 로그아웃 경로를 탄다. ④ **`signup`은 `rawPassword`, `login`은 `password`** 로 필드명이 다르다. **백엔드 선행은 B-4 하나**이며 화면 작업과 병렬 가능하므로 착수를 막지 않는다 — 그때까지 평점 블록은 **조건부로 숨기고 플레이스홀더 숫자를 넣지 않는다**(데모에서 실제 값처럼 보인다) |
