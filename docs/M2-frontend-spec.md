# CineMory M2 — 프론트엔드 설계 스펙

> 대상 리포: `cinemory-app` (**Expo SDK 57 / RN 0.86 / React 19.2** / TypeScript — 2026-09-06 업그레이드)
> 시각 기준: `cinemory-wireframe` (Figma Make 산출물, React + Vite + Tailwind v4)
> API 기준: `cinemory-backend` — **`docs/controller-layer-spec.md`가 API 표면의 단일 출처**
> 우선순위 기준: `CineMory_기획노트.md` **4-M2절**
>
> 이 문서는 **구현 스펙**이다. Claude Code가 이 문서를 근거로 코드를 작성한다.

---

## 📍 진행 현황 (최종 갱신 2026-09-09)

> **번호 없는 섹션이다.** 아래 §0~§13의 번호는 다른 문서가 참조하고 있어 바꾸지 않는다.
> **이 표는 작업이 끝날 때마다 갱신한다.**

### 현재 위치 — **M2-B 완료 → M2-C 구현 완료, 실기기 검증 대기**

```
M2-A 기반 ✅ ──► M2-B 1군 화면 ✅ ──► M2-C 2군 화면 🔨 ──► M2-D 3군 화면 🔒
   (완료)          (완료)          (구현 완료·검증 대기)      (백엔드 차단)
                                        └─► M2-C2 리포트 🔒 (백엔드 M3-a 동반)
```

| 단계 | 범위 | 상태 | 백엔드 의존 | 상세 |
|---|---|---|---|---|
| **M2-A**<br>기반 | 디자인 토큰 · 프리미티브 · API 클라이언트(단일 비행 인터셉터) · `authStore` · 부팅 시퀀스 · 네비게이션 골격 · 생성 타입 | ✅ **완료**<br>(실기기 검증 통과 2026-08-30) | 없음 | **`M2A-foundation-spec.md`** |
| **M2-B**<br>1군 화면 (9월) | `Login` · `SignUp` · `Home` · `SearchResult` · `MovieDetail` · `MyRecords` · `MyPage`/`Settings` | ✅ **완료**<br>(실기기 검증 통과 2026-09-06 — §7.1·§7.2·§7.3 전부) | ⚠️ **B-4**(상세 평점 필드)는 여전히 미해소 — 평점 블록만 자리를 비워 두고 진행했다 | **`M2B-screens-spec.md`**<br>요구사항은 §9.1~9.5 · §6 |
| **M2-C**<br>2군 화면 (10월) | `Wishlist` · `CollectionList`/`Detail` · `MovieDetail` 컬렉션 연결 | 🔨 **구현 완료 — 실기기 검증 전**<br>(`npx tsc --noEmit`·`expo export android` 통과 2026-09-09) | ✅ **API 완비 — 막는 것 없음**<br>B-6·B-7·B-18은 품질 개선(차단 아님) | **`M2C-screens-spec.md`**<br>요구사항은 §9.6~9.7 |
| **M2-C2**<br>리포트 | `Report`(통계·캘린더·월말) | 🔒 **차단** | **B-8** — 백엔드 M3-a 미착수. **엔드포인트 모양(응답 DTO·기간·타임존)부터 확정**해야 한다 | §9.8 · §11 B-8 |
| **M2-D**<br>3군 화면 (여유 시) | `Social` · `CineMap` · `Recommend` | 🔒 **차단** | **B-9**(`theater` 테이블 비어 있음)<br>**B-10**(활동 피드 API 없음)<br>**B-11**(M3-b 설계 백지) | §9.9~9.11 · §13 |

### M2-A 완료 근거

실기기 검증 A~D 통과 — 스타일링 육안 확인 · 부팅 3케이스(비로그인/로그인/`restore` 실패 폴백) ·
네비게이션 5케이스 · **동시 401에서 `reissue` 1회**. 되돌리기 4건(`access-token-ttl` `PT30M` 복구,
프로브 화면·임시 로그 제거, 로그 레벨)도 확인 완료. 절차와 결과는
`M2A-foundation-spec.md` §9·§11·§12.

### M2-B 완료 근거

`M2B-screens-spec.md` §7 전부 실기기 통과 — **§7.1 핵심 동선**(로그인 → 검색 → 영화 선택 →
시청 기록 저장 → 내 기록 반영, 0~8번 전 항목) · **§7.2 경계 케이스**(E-1~E-10 · G-1~G-6,
G-5는 스택 토폴로지상 `Settings` 자신으로 대체 검증) · **§7.3 동시 401**(`MovieDetail`의
실제 5개 병렬 호출에서 `reissue` 정확히 1회, `access-token-ttl` 임시값은 검증 직후 원복
확인). 과정에서 발견한 버그 4건(비밀번호 변경 시 인터셉터 오판 강제 로그아웃 · `TextField`
multiline 높이 고정 · 무한스크롤 풋터 마운트/언마운트로 인한 스크롤 점프 · G-5 시나리오
자체의 네비게이션 토폴로지 문제)은 전부 그 자리에서 수정·재검증했다. 상세는
`M2B-screens-spec.md` 변경 이력과 `docs/DevLog.md` 2026-09-05·09-06.
**B-4(상세 평점)만 의도적으로 미해소 상태로 남기고 진행했다** — 화면 자리만 비워 뒀다(§6).

### 각 단계 진입 조건

| | 조건 |
|---|---|
| **M2-C** | 없음 — 바로 착수 가능 (2026-09-09 `Report` 분리로 블로커가 사라졌다) |
| **M2-C2** | **B-8.** 백엔드 M3-a와 동반. 차트 라이브러리(`react-native-gifted-charts`)도 이 시점에 설치한다 |
| **M2-D** | **셋 다 백엔드 선행이 필요하다.** 지금 만들면 빈 화면이 나온다(§2·§11) |

### M2-B 도중 발생하는 워크플로 전환

**카카오 로그인을 실기기에 붙이는 시점(대략 9월 중순)이 되돌리기 어려운 분기점이다.**

- `npx expo prebuild` → **Expo Go 사용 불가**, 팀 전원 Dev Client 필요 (§11.1)
- 같은 시점이 **실서버 배포 트리거**다 (기획노트 4-INF)
- ⚠️ **prebuild를 카카오 하나로 결정하지 말 것** — §13의 지도 네이티브 SDK가 두 번째 요구이며,
  **묶어서 한 번에 넘어가는 편이 총비용이 낮다**

### 상시 참조

- **백엔드 선행 항목 19건** → **§11** (B-1~B-19. 미해소는 B-1·B-4·B-6~B-14·B-18·B-19)
- **화면 우선순위의 근거** → §2 (기획노트 4-M2). 3군이 뒤인 것은 취향이 아니라 백엔드 부재다
- **발표는 11월.** 개강 후 가용 시간은 방학의 절반 이하로 본다(기획노트 4절 중간 점검)

---

## 📚 문서 구성 — 무엇을 어디에 쓰는가

M2 문서는 **우산 문서 1개 + 단계 문서 N개**로 나눈다. 백엔드가 이미 쓰는 구조와 같다
(`jpa-entity-spec` · `service-layer-spec` · `security-spec` · `controller-layer-spec`을
`CineMory_기획노트.md`가 묶는 형태).

**판별 기준은 한 줄이다.**

> ### **"M2가 끝난 뒤에도 읽을 것인가?"**
> **예 → 우산 문서 · 아니오 → 단계 문서**

| | **우산** `M2-frontend-spec.md` | **단계** `M2A-` · `M2B-` · … |
|---|---|---|
| 성격 | M2 내내 참조하는 **계약과 사실** | 그 단계에만 유효한 **실행과 검증** |
| 내용 | 진행 현황 · API 표면 · 도메인 사실 · 인증 **계약** · 디자인 토큰 · 네비게이션 구조 · 화면 요구사항 · 백엔드 선행 항목 | 실행 순서 · 파일 단위 지시 · 인증 **구현 코드** · 검증 절차 · 구현 리뷰 결과 · 그 단계 변경 이력 |
| 수명 | M2 전체 | 단계 종료 후 아카이브 |

**중복이 아니라 계층으로 나눈다.** 인증이 그 예다 — 우산 §6.3은 *"왜 단일 비행이어야
하는가"*(계약), `M2A-foundation-spec.md` §4.2는 *"어떻게 짜는가"*(코드). 같은 주제지만
층이 다르므로 중복이 아니다. **같은 층의 같은 사실을 두 문서에 적으면 반드시 어긋난다.**

**참조는 한 방향으로만 건다 — 단계 문서 → 우산 문서.** 반대로 걸면 우산 문서가 이미 끝난
단계를 계속 가리키게 되고, 단계가 늘수록 죽은 링크가 쌓인다.

⚠️ **우산 문서의 섹션 번호(§0~§13)는 바꾸지 않는다.** 단계 문서들이 §4·§5.2·§6.3·§11.1·§13
등을 참조하고 있어 번호를 밀면 전부 깨진다. 새 절이 필요하면 이 절처럼 **번호 없는 섹션**으로
앞에 붙이거나 하위 절(§5.7 등)로 넣는다.

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
| 스타일링 | **NativeWind v4.2.6** + `tailwindcss@^3.4` (✅ SDK 57 / RN 0.86 검증 완료 — Uniwind 폴백 불요) | 와이어프레임 Tailwind 클래스 이식. 토큰+프리미티브로 격리 |
| 네비게이션 | `@react-navigation/native-stack` + `bottom-tabs` (설치 완료) | 와이어프레임의 `useState` 조건부 렌더링을 스택으로 평탄화 |
| 타입 | **`openapi-typescript`로 `/v3/api-docs`에서 생성** | 5-7 D에서 검증된 경로. 손으로 쓰면 즉시 어긋난다 |
| 서버 상태 | `@tanstack/react-query` v5 | 기획노트 6절이 이미 지정 |
| 클라이언트 상태 | `zustand` | 기획노트 6절이 이미 지정 |
| 토큰 저장 | `expo-secure-store` | 리프레시 토큰을 `AsyncStorage`에 두지 않는다 |
| 아이콘 | `lucide-react-native` | 와이어프레임 아이콘명 그대로 |
| 차트 | `react-native-gifted-charts` + `react-native-svg` | recharts 대체 (2군에서 필요) |
| 지도 | `react-native-webview` + Kakao Maps JS SDK, **인터페이스 격리** | §13 |
| **접근 모델** | **게스트 우선** — 비로그인이 기본, 로그인은 선택 (2026-08-30 확정) | 백엔드가 `viewerId == null`을 정상 입력으로 확정(service-layer-spec 4-6)했고 `PUBLIC_GET_ENDPOINTS`가 이미 열려 있다. §6.7 |
| 브랜치 | `develop`에서 작업, `feature/*` 분기 | 기획노트 5절. ✅ `develop` 전환 완료 (2026-08-30) |

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
| GET | `/api/movies/random?size=` | **`List<MovieSummaryResponse>`** (페이징 아님) | home 배경. ⚠️ **미구현 — B-17** |

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
| **PATCH** | `/api/records/{recordId}` | 200 `WatchRecordResponse` | ⚠️ **미구현 — B-15.** 전체 치환 의미(생략 = null). 설계는 §11.2 |
| GET | `/api/movies/{movieId}/reviews` | `PageResponse<ReviewResponse>` | |
| **PUT** | `/api/movies/{movieId}/review` | 200 `ReviewResponse` | **upsert**. POST 아님. ⚠️ **바디는 `{ content }` 뿐 — 별점을 받지 않는다**(§7.3) |
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
| `INVALID_TOKEN` · `REFRESH_TOKEN_NOT_FOUND` · `REFRESH_TOKEN_REUSED` · `UNAUTHORIZED` | **즉시 로그아웃** |
| `INVALID_CREDENTIALS` | 호출부(폼)에 표시 — **인터셉터 개입 없음** |
| `INVALID_NONCE` | nonce 재발급 후 카카오 로그인 재시도 |
| `INVALID_OAUTH_TOKEN` | §6.5 참고 |

⚠️ **이 표에 없는 401 코드는 전부 "인터셉터 개입 없음" 쪽이다.** `TOKEN_EXPIRED`가 아니라고
곧바로 로그아웃 처리하면 안 된다 — `INVALID_CREDENTIALS`가 `/api/auth/login`(인터셉터 대상
밖)에서만 나온다고 가정하고 짰다가, **인증된 요청 안에서 입력값이 틀려서 401을 반환하는
엔드포인트**(예: `PATCH /api/users/me/password`의 현재 비밀번호 불일치)가 처음 생겼을 때
실기기에서 "틀린 값 입력 → 강제 로그아웃"으로 터진 적이 있다(M2B-screens-spec.md §5.6
변경 이력 2026-09-05). `UNAUTHORIZED`는 백엔드의 `requireAuthenticated`(viewerId null
방어 코드, 정상 흐름에선 SecurityFilterChain이 먼저 막아 도달하지 않는 이중 방어)에서만
나와 토큰 문제와 동치로 보고 로그아웃 대상에 포함했다.

### 6.4 저장과 부팅 시퀀스

- `accessToken` / `refreshToken` 모두 **`expo-secure-store`**. `AsyncStorage`에 두지 않는다.
- **부팅 시 SecureStore를 읽는 동안 SplashScreen을 유지**한다(`expo-splash-screen`의
  `preventAutoHideAsync`). 빠뜨리면 앱 실행마다 로그인 화면이 한 번 깜빡였다가 메인으로 넘어간다.
- `authStore`(zustand)의 `status: 'loading' | 'authenticated' | 'anonymous'` 3상태는 유지한다.
  ⚠️ **다만 `anonymous`의 의미가 바뀌었다(§6.7 게스트 우선).** 예전에는 *"로그인 화면을 보여라"*
  였고, 지금은 *"게스트로 둘러보는 중"* 이다. **`RootNavigator`는 더 이상 `status`로 분기하지
  않고 항상 `MainTabNavigator`를 띄운다.**
- 부팅 후 도착 지점: 토큰이 있으면 **로그인 상태의 홈**, 없으면 **게스트 상태의 홈**. 어느 쪽이든
  **홈이며 로그인 화면이 아니다.**

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

### 6.7 ★ 게스트 우선 — 접근 모델 (2026-08-30 확정)

**비로그인이 기본이고 로그인은 선택이다.** 앱을 처음 켠 사람은 로그인 화면이 아니라 **홈**을 본다.

**근거** — 백엔드가 `viewerId == null`을 **예외가 아닌 정상 입력**으로 확정했고
(`service-layer-spec.md` 4-6: *"비로그인 조회 허용"*), `SecurityConfig.PUBLIC_GET_ENDPOINTS`가
영화·극장·박스오피스·타인 공개 데이터를 이미 열어뒀다. 프론트가 전부 막으면 그 설계가 사장된다.

#### 무엇이 열리고 무엇이 막히나

| 게스트 가능 | 로그인 필요 |
|---|---|
| 영화 검색 (`registered`) | **미등록 영화 선택** (`POST /api/movies/sync` — 인증 필수) |
| 영화 상세 · 출연진 | 시청 기록 · 리뷰 작성 · 찜 · 컬렉션 |
| 공개 리뷰 목록 | 마이페이지 전체 |
| 박스오피스 · 극장 | 팔로우 · 댓글 |
| 타인의 **공개** 기록·컬렉션 | 타인의 비공개/친구 공개 데이터 |

#### 네비게이션 — 인증을 **모달**로 뺀다

`RootNavigator`가 `status`로 분기하던 구조를 버린다. 대신 `AuthNavigator`를 **필요할 때 올리는
모달 스택**으로 둔다.

```
RootNavigator (NativeStack, headerShown: false)
├── Main       MainTabNavigator                     ← 항상 여기서 시작
└── AuthModal  AuthNavigator (presentation: 'modal') ← 로그인이 필요한 순간에만 push
```

- 로그인 성공 → `authStore.setTokens()` + `setUser()` → **모달을 닫는다**(`goBack()`).
  뒤에 있던 화면이 그대로 남아 있고, 훅들이 재조회되며 로그인 상태로 다시 그려진다.
- ⚠️ **M2-A의 *"화면에서 수동으로 navigate하지 않는다"* 규칙이 여기서만 바뀐다.** 모달은
  명시적으로 닫아야 한다. 다만 **탭 스택을 갈아끼우는 일은 여전히 없으므로**, 그 규칙이 막으려던
  사고(로그아웃 후 이전 사용자 화면이 스택에 남는 것)는 애초에 발생하지 않는다.
- 로그아웃도 화면을 바꾸지 않는다. `status`만 `anonymous`가 되고 각 화면이 게스트 상태로 다시 그려진다.
  ⚠️ 인증 전용 화면(`MyRecords` 등)에 머문 채 로그아웃하면 **그 자리에서 로그인 유도로 바뀐다.**

#### 게이트는 두 종류다

| | 쓰는 곳 | 형태 |
|---|---|---|
| **화면 게이트** | 화면 전체가 로그인 필요 (`MyPage` · `MyRecords`) | `<AuthRequired>` — 안내 + `로그인` 버튼 |
| **액션 게이트** | 화면은 보이되 특정 동작만 (찜·기록·리뷰·`sync`) | `useRequireAuth()` — 미로그인이면 모달을 올린다 |

```ts
// src/hooks/useRequireAuth.ts
const requireAuth = useRequireAuth();
onPress={() => requireAuth(() => toggleWish(movieId))}   // 로그인 상태면 실행, 아니면 모달
```

**로그인 후 원래 동작을 이어서 실행할지는 M2-B 범위 밖으로 둔다.** 모달을 닫고 사용자가 다시
누르게 한다 — 대기 중인 액션을 보관했다가 재생하는 구조는 상태가 꼬이기 쉽고, 지금 값이 크지 않다.

#### ⚠️ 401 인터셉터에 게스트 가드를 추가한다

게스트는 토큰이 없으므로 인증 필요 API를 부르면 401을 받는다. 현재 인터셉터는 401에서
`logout()`을 호출하는데, **게스트를 로그아웃시키는 것은 무의미하고 refresh 시도는 낭비다.**

```ts
if (useAuthStore.getState().status !== 'authenticated') {
  throw normalizeError(error);   // 게스트의 401은 그대로 화면으로 — refresh·logout 안 한다
}
```

**애초에 게스트가 인증 API를 부르지 않는 것이 정상이다**(훅의 `enabled`가 막는다).
이 가드는 그래도 새는 경우를 위한 이중 방어다.

#### 탭별 게스트 동작

| 탭 | 게스트 |
|---|---|
| 홈 · 검색 · 상세 | ✅ 정상 |
| CineMap | ✅ 박스오피스·극장이 `permitAll` (단 3군이라 M2에서는 플레이스홀더) |
| 추천 · 소셜 | 3군 플레이스홀더 (변화 없음) |
| **마이페이지** | 🔒 `<AuthRequired>` — 로그인 유도 |

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

### 7.3 ★ 별점 — 0.0~10.0, 저장소는 `watch_record` 하나다

**스케일** — 와이어프레임은 별 5개 UI인데 백엔드는 `Double` **0.0~10.0**이다.

```
UI 0.5 ~ 5.0 (0.5 단위)  ⇄  API 1.0 ~ 10.0 (1.0 단위)
표시: apiRating / 2      저장: uiRating * 2
```

- 변환 함수를 `src/utils/rating.ts` 한 곳에 두고 화면에서 직접 곱하지 않는다.
- ⚠️ **범위 위반은 `@Valid`가 아니라 엔티티 `IllegalArgumentException` 경로로 나간다.**
  응답 `code`가 `INVALID_INPUT_VALUE`가 아니므로 폼 에러 매핑에서 누락되기 쉽다.
  → 클라이언트에서 먼저 막는다.

#### ★ 별점의 단일 출처 = `watch_record.rating` (2026-09-01 확정)

**`review.rating` 컬럼은 제거한다.** 별점은 시청 기록에만 저장하고, 리뷰는 그것을 **참조해
표시만** 한다. 저장하지 않으므로 두 값이 어긋날 여지가 원천적으로 없다.

> **왜 바꿨나** — `watch_record`와 `review` 양쪽에 `rating`이 있어 *"이 사용자의 이 영화 별점"*
> 이 무엇인지 정의되지 않았다. 백엔드도 이를 **R-1(M3 블로킹 미결)** 으로 등록해 둔 상태였고
> (*"`watch_record`에도 `rating`이 있으나 쓰이지 않고…"*), 프론트가 상세 화면을 만들며 같은
> 문제를 만났다. **이 결정으로 R-1이 대표 기록 기준으로 자동 확정된다.**

**표시 규칙 — 2단계 폴백**

```
리뷰에 표시할 별점
 = 대표 기록(is_representative = true)의 rating
 → null이면  rating이 있는 가장 최근 기록의 rating
 → 그것도 없으면  별점 없음 (표시 생략)
```

⚠️ **폴백이 없으면 버그처럼 보인다.** 새 `watch_record`를 INSERT하면 **대표가 자동으로 승격**되고
(`기획노트` 3-(3)), `rating`은 nullable이다. 즉 **별점 없이 재관람 기록만 추가해도 예전 리뷰의
별점이 사라진다.** 사용자는 원인을 추적할 수 없다. 폴백이 이 경우를 막는다.

> 두 규칙 모두 인덱스가 있다 — `idx_watch_record_representative(user_id, movie_id, is_representative)`,
> `idx_watch_record_user_id_movie_id_id(user_id, movie_id, id DESC)`.

**의도된 동작으로 못박는 것** — 별점을 매긴 재관람을 추가하면 **공개 리뷰의 별점도 함께 바뀐다.**
텍스트는 예전 것이고 별점만 최신이 될 수 있으나, *"별점은 지금 이 영화를 어떻게 생각하는가"* 로
정의했으므로 이는 버그가 아니다. 파생값의 본질이며, 대안(작성 시점 스냅샷)은 다시 동기화 문제를 만든다.

**화면에서의 귀결**

| | 입력 | 위치 |
|---|---|---|
| 별점 | `watch_record.rating` | **시청 기록 모달에만** |
| 그날의 메모 | `watch_record.note` | 시청 기록 모달 (회차별·짧게) |
| 공개 리뷰 | `review.content` | 상세 화면의 리뷰 영역 — **텍스트만** |

- 리뷰 작성 UI에 별점 입력을 두지 않는다. *"별점은 내 시청 기록의 별점이 함께 표시됩니다"* 안내를 둔다.
- `ReviewResponse.rating`은 **nullable**이다(기록이 없거나 별점을 한 번도 안 매긴 경우). null이면 별점 영역을 생략한다.
- ⚠️ 백엔드 조인은 **`LEFT JOIN`** 이어야 한다. `INNER JOIN`이면 **시청 기록 없이 쓴 리뷰가 목록에서 통째로 사라진다**(리뷰는 기록 없이도 작성 가능 — `기획노트` 2-3).

### 7.4 영화 상세의 평점 — ⚠️ 현재 API로는 불가능

`MovieDetailResponse`에 **평점 필드가 하나도 없다**. `Movie` 엔티티에는 `voteAverage`/`voteCount`가
있지만 DTO로 노출되지 않고, 우리 평점(`AVG(review.rating)`) 집계 쿼리도 `ReviewRepository`에 없다.

→ **백엔드 선행 작업이다** (tmdb-sync 잔여 #24, 처리 시점이 "프론트 상세 화면 구현 시"로
지정돼 있다). §11 참고. 그때까지 상세 화면의 평점 영역은 **자리만 잡아두고 숨긴다.**

⚠️ **이건 집계 평점(TMDB `voteAverage` 또는 전체 사용자 리뷰 평균) 이야기다 — "내가 매긴
이 영화의 별점"과는 다른 데이터다.** 후자는 이미 `watchLog`(내 시청 기록)에 있어 B-4와
무관하게 표시할 수 있다(2026-09-10, 히어로 아래 큰 별점으로 추가 — §9.3).

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

> ⚠️ **2026-08-30 개정 — 게스트 우선 전환(§6.7).** `RootNavigator`가 `status`로 분기하던
> 구조를 버리고, 인증을 **모달 스택**으로 뺐다.

```
RootNavigator (NativeStack, headerShown: false)
├── Main       MainTabNavigator (BottomTabs 5개)      ← 항상 여기서 시작
└── AuthModal  AuthNavigator (presentation: 'modal')  ← 로그인 필요 시에만 push
    └── Login · SignUp · PasswordResetRequest · PasswordResetConfirm

MainTabNavigator
    ├── HomeStack       Home → SearchResult → MovieDetail
    ├── RecommendStack  Recommendation(3군, 플레이스홀더) → MovieDetail
    ├── CineMapStack    CineMap(3군, 플레이스홀더)
    ├── SocialStack     Social(3군, 플레이스홀더) → MovieDetail · CollectionDetail
    └── MyPageStack     MyPage → MyRecords → MovieDetail
                             → Wishlist → MovieDetail
                             → CollectionList → CollectionDetail → MovieDetail
                             → Report(2군) · EditProfile · Settings
```

**`RootStackParamList`도 함께 바뀐다.**

```ts
export type RootStackParamList = {
  Main:      NavigatorScreenParams<MainTabParamList>;
  AuthModal: NavigatorScreenParams<AuthStackParamList>;   // ← 분기가 아니라 모달
};
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

### 8.6 ⚠️ 뒤로가기 가드 — 진입 직후 빠른 뒤로가기 시 빈 화면 버그 (2026-09-10 해결)

**증상 (실기기 발견).** 아무 화면이나 진입 직후 push 전환 애니메이션이 끝나기 전에 곧바로
뒤로가기를 누르면 빈 화면이 떴다가, 다시 한 번 눌러야 정상 동작했다. 처음엔 `MovieDetail`
전용 문제로 보고됐으나(API 5개 + 히어로 이미지를 동시에 불러오는 무거운 화면이라 의심을
받았다), 실기기 재현 범위를 넓혀보니 **모든 화면의 뒤로가기에서 재현**됐다 —
`MovieDetail`의 무게와는 무관한, native-stack 전체에 걸친 문제였다.

**원인.** Android native-stack은 화면 전환을 `Fragment` 트랜잭션으로 처리한다. push
트랜잭션이 끝나기 전(`transitionStart`~`transitionEnd` 사이) pop이 들어오면 트랜잭션이
겹쳐 화면 렌더링 서피스가 제대로 재부착되지 못하고 한 프레임이 빈 채로 남는다 — 두 번째
뒤로가기가 정상인 것은 그때는 이미 트랜잭션 큐가 정리된 뒤이기 때문이다.

**이분 탐색으로 배제한 것들.**
- `freezeOnBlur: true`(native-stack 화면 옵션) — 효과 없음.
- `headerTransparent: false`로 임시 전환 — 그대로 재현. `MovieDetail`의 투명 헤더와 무관함을 확정.
- `animation: 'none'`으로 전환 애니메이션 자체를 끔 — **사라짐.** 전환 애니메이션 경합이
  원인임을 확정한 지점이자, 여기서 재현 범위를 전 화면으로 넓혀 재확인했다.
- `detachPreviousScreen: false` — **native-stack엔 이 개념 자체가 없다.** JS 기반
  `@react-navigation/stack`(미설치)에서만 쓰는 옵션이라 타입에도, 네이티브 구현에도 없음을
  `react-native-screens` README로 확인. native-stack은 네이티브 컨트롤러가 전환을 맡아
  "이전 화면을 detach하냐"를 JS에서 켜고 끌 지점이 없다.
- `animationDuration: 150`(기본값보다 단축) — 레이스 발생 창을 좁힐 뿐이라 여전히 재현.

**해결 — `src/navigation/backGuard.ts`.** 애니메이션 지속시간은 원래대로 두고, 그 시간
창에 들어오는 뒤로가기 자체를 막는다. `beforeRemove`는 하드웨어 back 버튼·헤더 back
버튼·스와이프 제스처를 전부 같은 지점에서 가로채는 React Navigation 표준 API라(native-stack의
`onHeaderBackButtonClicked`가 결국 `StackActions.pop()`을 `dispatch`하는 경로이고, iOS
`preventNativeDismiss`도 같은 차단 신호에 연동돼 있다) 트리거별로 따로 처리할 필요가 없다.

```ts
// src/navigation/backGuard.ts — 개념
let transitionCount = 0;              // 나가는 화면·들어오는 화면 양쪽에서
                                       // transitionStart/End가 한 쌍씩 오므로 boolean이 아니라 카운터
export const BACK_GUARD_SCREEN_LISTENERS = {
  transitionStart: () => { transitionCount += 1; },
  transitionEnd:   () => { transitionCount = Math.max(0, transitionCount - 1); },
  beforeRemove: (e) => { if (transitionCount > 0) e.preventDefault(); },
};
```

**모든 `Stack.Navigator`의 `screenListeners`에 그대로 연결한다** — Root·Auth·Home·MyPage·
Social·Recommend·CineMap 7곳 전부. 체감상으로는 push 직후 짧은 시간(기본 애니메이션
지속시간만큼) 뒤로가기가 씹히는 것처럼 느껴지고, 그 시간이 지나면 정상 동작한다.

⚠️ **`MovieDetail`이 4개 스택(Home·MyPage·Social·Recommend)에 옵션까지 복붙으로 등록돼
있던 것도 이번에 정리했다** — 여러 스택에서 재현되는 버그를 실험하면서 한 곳만 고치고
나머지를 놓치기 쉬운 구조였다. `src/navigation/movieDetailScreenOptions.ts`(`MovieDetail`
전용 옵션)와 `src/navigation/defaultStackScreenOptions.ts`(스택 공통 옵션, 지금은 실험
잔재 없이 빈 객체)로 빼서 각 스택 파일은 이 상수들을 참조만 한다.

상세 경위(각 실험 단계와 실기기 확인 결과)는 `docs/DevLog.md` 2026-09-10 참고.

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

**3개 레이어다.** 와이어프레임 구조를 그대로 옮기되 RN 제약에 맞춰 변환한다.

```
① 배경   4열 포스터 그리드 · 60초 무한 상향 루프 · opacity 0.2
② 로고   56px / 700 / 시안 + **↘ 압출 3겹 + 키라인 1겹** (입체 타이포)
③ 검색바 반투명 흰 배경 · rounded-xl · shadow · 좌측 아이콘
```

**① 배경 — 포스터 소스는 로그인 여부로 갈린다** (2026-09-06 확정)

| 조건 | 소스 |
|---|---|
| 로그인 + 기록 **12편 이상** | `GET /api/users/{myId}/records`의 `posterPath` (클라이언트 셔플) |
| 그 외 (게스트 · 기록 부족 · 0건) | **`GET /api/movies/random?size=20`** (B-17) |

- ⚠️ **기록 0건인 신규 가입자를 반드시 폴백시킨다.** 가입 직후가 인상이 가장 중요한 순간인데
  배경이 비어버린다.
- ⚠️ **12편 임계값의 이유** — 80칸을 5장으로 채우면 같은 포스터 반복이 눈에 띈다.
- 두 소스 모두 **정렬이 고정**(`OrderBy` 없음)이므로 클라이언트에서 셔플한다.
- **로그인/로그아웃 시 배경이 교체된다** → 크로스페이드(200~300ms). 게스트 우선 구조에서
  모달만 닫히고 홈이 남는 것이 장점인데, 배경만 뚝 바뀌면 어색하다.
- 애니메이션: `withRepeat(withTiming(-CYCLE_H, { duration: 60000, easing: Easing.linear }), -1, false)`.
  ⚠️ 세 번째 인자가 `true`면 위아래로 왕복한다. 같은 세트를 두 번 깔고 한 세트 높이만큼 올려
  이음매를 없앤다(CSS `translateY(-50%)`와 같은 기법).
- ⚠️ **탭을 떠나면 애니메이션을 멈춘다** — `useFocusEffect`로 `cancelAnimation`. 안 하면 다른
  탭에 있는 동안에도 60초 루프가 계속 돈다.
- **blur는 라이브러리 없이 해결한다** — `PosterSize`에 **`BACKDROP_TILE: 'w92'`** 를 추가하고
  작은 이미지를 큰 셀에 넣으면 업스케일되며 뭉개진다. `opacity 0.2`와 합쳐 배경으로 충분히
  물러난다. `expo-blur`는 Android 성능 이슈가 있어 마지막 수단이다.

**② 로고 — 입체 압출 타이포** (2026-09-09 개정. 이전: 4방향 아웃라인)

의도는 처음부터 **입체 글자 로고**(영화 *애스터로이트 시티* 타이틀)였으나, 와이어프레임이 쓴
`text-shadow` 4방향(`±2px`, 좌상만 `brandDeep`·나머지 셋 `brandLight`)은 **압출이 아니라
오프셋 인쇄 오차**로 보였다. 원인 넷 — ① **4방향 대칭이라 깊이 방향이 없다**(입체는 광원이
하나이므로 그림자도 한 방향이어야 한다) ② **좌상단만 색이 달라** 판이 밀린 것처럼 보인다
③ 56px에서 2px는 **너무 얇다** ④ 오프셋을 **한 번만** 찍어 본체와 그림자 사이가 비어 면이
생기지 않는다.

→ **한 방향(↘) × 1px씩 연속으로 쌓는 진짜 압출**로 바꾼다.

| 층 | 색 | 오프셋 |
|---|---|---|
| 키라인 (맨 뒤 1겹) | **`brandLight`** `#DBF5F0` | `depth + 1` |
| 압출 (`depth`겹) | `brandDeep` `#37BEB0` | `1` ~ `depth` |
| 본체 | `primary` `#14D9D9` | `0` |

**깊이는 `fontSize` 비율로 잡는다 — px 상수로 박지 않는다.**

```
depth = max(2, round(fontSize * 0.055))     // 56px → 3
```

- ⚠️ **최소 2겹을 보장한다.** 스플래시·로그인에서 작게 쓸 때 1겹이 되면 압출이 아니라
  그냥 드롭섀도로 보인다.
- ⚠️ **↘ 대각선이라 눈에 보이는 두께는 `depth × √2`(3px → 약 4.2px)** 다. 같은 숫자라도
  수직 압출보다 두껍게 읽히므로, 수직으로 바꾸면 `depth`를 다시 잡아야 한다.
- **6px(11%)은 과했다** — 대각선 압출이 글자 사이를 메워 `M`·`y`가 뭉갠다. 3px에서 해소된다.

**🔖 키라인 색은 `brandLight`로 채택하되 `shadowDeep`(≈`#1F7A72`) 전환을 보류 기록한다.**
둘은 성격이 반대다 — `brandLight`는 **밝은 테두리**(앞으로 튀어나온 느낌), `shadowDeep`은
**그림자**(뒤로 물러난 느낌)다.

| | `brandLight` (채택) | `shadowDeep` (보류) |
|---|---|---|
| 어두운 포스터 배경 | ✅ 또렷 | ⚠️ 묻힌다 |
| 밝은 포스터 배경 | ⚠️ 흐려진다 | ✅ 또렷 |
| **흰 배경(스플래시·로그인)** | ❌ **거의 안 보인다** | ✅ 보인다 |
| 토큰 | 이미 있다 | 신규 추가 필요 |

`brandLight`를 택한 이유는 **새 토큰이 필요 없고**, 4방향 시절 3방향에 흩어져 "밀린 인쇄"를
만들던 그 색을 **버리지 않고 제 역할(맨 뒤 테두리)로 옮기는 것**이기 때문이다.
⚠️ **다만 로고를 흰 배경 화면(스플래시·로그인)에 쓰기 시작하면 이 선택을 다시 본다.**

**컴포넌트 — `OutlinedText` → `ExtrudedText`**

```
ExtrudedText({ children, style, extrudeColor, keylineColor, direction?, depth? })
```

- **키라인 색을 prop으로 뺀다** — `shadowDeep` 전환을 **인자 하나 교체**로 끝내기 위함이다.
  컴포넌트에 박으면 홈·스플래시·로그인을 전부 찾아다녀야 한다.
- ⚠️ **그리는 순서가 이전과 반대다.** 기존 `OutlinedText`는 `CORNERS`를 역순으로 돌려 인덱스
  0(좌상단)을 맨 위로 올렸지만, 압출은 **가장 먼 층(키라인)이 가장 먼저** 그려져야 한다.
  RN은 나중에 그린 형제가 위에 쌓이므로 `i = depth+1 → 0` 순으로 내려온다.
- ⚠️ **본체를 제외한 전 층에 `importantForAccessibility="no-hide-descendants"` /
  `accessibilityElementsHidden`을 건다** — 안 걸면 스크린 리더가 "CineMory"를 다섯 번 읽는다.
- 레이어는 총 **5겹**(본체 + 압출 3 + 키라인 1)으로 **기존 5겹과 동일** — 성능 변화가 없다.
- 로고 크기는 **홈 전용 스타일**로 둔다(`Txt`의 `h1`은 32px이고 토큰을 바꾸면 다른 화면이 전부 영향받는다).

**❓ 미결 — 폰트.** 압출이 3px로 얇아진 만큼 **글자 자체의 무게가 인상을 좌우한다.** 시스템
`700`은 획이 얇아 압출 옆면이 면이 아니라 선으로 보인다. 헤비 폰트(`expo-font`) 도입은
별도 판단이며, 도입 시 `useFonts` 로딩을 **`authStore.restore()`와 한 곳에서 합류**시켜야
한다 — 두 곳에서 각자 스플래시를 풀면 깜빡인다.

**③ 검색바 — `backdrop-blur`는 뺀다**

배경이 이미 `opacity 0.2`로 물러나 있어 반투명 흰 배경만으로 충분하다. `BlurView`는 Android
성능만 먹는다. 그림자는 iOS `shadow*` / Android `elevation`으로 분기한다.
동작은 기존과 동일 — `onSubmitEditing` → `navigate('SearchResult', { query })`.

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

**레이아웃** (2026-09-10 히어로 개정. 이전: 히어로 256 + 포스터 카드 112×160 분리)
1. **히어로 — 화면 폭 대형 포스터, 4:5 상단 기준 크롭, 하단은 배경색으로 페이드**
   (2026-09-10, 1:1로 줄였다가 "너무 줄었다"는 피드백으로 4:5 롤백 — 미세조정 예정)
2. **제목 + `{연도} · {runtime}분` — 히어로 *아래*, 가운데 정렬**
3. **내 별점(있으면) — 제목 아래, 가운데 정렬, 크게, 탭해서 수정 가능** (2026-09-10 신설,
   탭 수정은 같은 날 후속). 시청 기록의 대표 기록에서 가져온다 — 폴백은 §7.3과 동일
   (대표 → 별점 있는 최근 기록 → 없으면 생략). 탭하면 **항상 대표 기록의 별점을 갱신**한다.
   ⚠️ **§7.4의 집계 평점(B-4, 아직 차단)과는 다른 데이터**이니 헷갈리지 않는다
4. 정보 카드 — 장르 / 국가 / 감독 / 출연(상위 20명, 더보기는 `/cast`)
5. 줄거리(`overview`)
6. **내 기록 카드**
7. 리뷰 섹션

**★ 히어로 — 이음매를 "다듬지" 않고 없앤다** (2026-09-10 확정)

`backdropPath`가 없어(B-14) `posterPath`를 키워 쓴다. 처음엔 포스터 위에 제목을 얹고
하단을 블러로 아래 콘텐츠와 이으려 했으나 **경계가 계속 남았다.** 원인이 셋이었다.

| # | 원인 |
|---|---|
| ① | `BlurView`의 `intensity`는 **뷰 전체에 균일**하다 → 세기가 다른 밴드를 쌓으면 **경계마다 가로줄**이 생긴다 |
| ② | 맨 위 밴드의 **상단 하드 엣지**는 강도를 낮춰도 안 없어진다(블러 ≠ 무블러) |
| ③ | ★ **값 반전** — 그라디언트가 `투명 → 검정 60% → #FFFFFF`라 마지막 구간이 **탁한 회색 띠**가 된다. 흰 배경 앱에 어두운 스크림을 쓰면 반드시 생긴다 |

**그리고 이 문제는 텍스트 배치와 같은 문제였다.**

> 제목을 포스터 위에 얹는다 → 흰 글씨가 필요하다 → 어두운 스크림이 필요하다
> → 흰 배경으로 이어질 때 값이 반전된다 → **경계가 생긴다**

→ **텍스트를 히어로 밖으로 빼서 사슬을 끊는다.** 스크림이 필요 없어지고,
포스터를 `colors.background` **바로 그 색으로** 페이드하면 **이을 경계 자체가 없다.**

```
히어로  height = width * 1.25            (4:5 — 2026-09-10 1:1로 줄였다가 롤백, 미세조정 예정)
  └ Image  height = width * 1.5, top: 0  (2:3 원본, 컨테이너가 overflow hidden)
  └ LinearGradient  하단 38%
       ['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)', colors.background]
       locations=[0, 0.55, 1]
```

- ⚠️ **`resizeMode="cover"`를 쓰지 않는다.** 가운데 기준으로 잘라 **위쪽(인물·타이틀)이 잘린다.**
  원본 비율 이미지를 `top: 0`에 두고 컨테이너로 잘라 **아래쪽만** 잘리게 한다 — 잘리는 구간은
  어차피 페이드가 덮는다.
- ⚠️ **`expo-blur` 의존을 제거한다.** 이 화면이 유일한 사용처였다(홈 배경은 `w92` 업스케일로 대신).
- **4:5 채택.** 2:3 full-bleed는 390px 폭 기기에서 **585px(화면의 69%)** 가 되어 정보가
  전부 스크롤 밖으로 밀린다. **1:1(46%)로도 실기기 확인을 해봤으나 "포스터 비중이 너무
  줄었다"는 피드백으로 4:5로 롤백했다(2026-09-10).** 정보 박스 노출과 포스터 비중 사이의
  정확한 지점은 **추후 미세조정 예정**(미결로 남긴다).

  | 비율 | 390px 기기 | 화면 점유 |
  |---|---|---|
  | 2:3 | 585px | 69% — 정보가 전부 밖 |
  | **4:5 (현재)** | **487px** | **58%** — 첫 화면 정보 노출은 살짝 부족하지만, 포스터 비중을 우선했다 |
  | 1:1 (기각) | 390px | 46% — 정보는 다 들어오지만 포스터 느낌이 너무 옅어진다 |

- **검토했으나 택하지 않은 둘** — **마스크 연속 블러**(`@react-native-masked-view`로 단일
  `BlurView`에 그라디언트 마스크)는 계단을 확실히 없애지만 **어두운 스크림으로 끝나므로 아래
  콘텐츠도 어두워야 하고**, 결국 **이 화면만 다크 테마**가 되어 화면 전환이 튄다.
  **텍스트 그림자만 쓰는 안**은 **포스터 하단이 밝으면 흰 글씨가 죽어** 포스터 색에 운을 맡기게 된다.

**★ 히어로 탭 → 포스터 전체 보기** (2026-09-10 확정)

크롭했기 때문에 필요해진 기능이다 — 크롭하지 않았다면 같은 것을 다시 보여주는 셈이라
의미가 없다. **두 결정이 서로를 정당화한다.**

- `Modal`(transparent) + `Image` `resizeMode="contain"` + 어두운 배경 + 탭/닫기 버튼.
  `ActionSheet`·`WatchRecordModal`이 이미 쓰는 패턴이라 새로 익힐 것이 없다
- ⚠️ **`PosterSize.HERO`(`w780`)를 그대로 재사용한다 — 추가 다운로드가 0이라 탭하면 즉시 뜬다.**
  `original`은 2~4MB라 오히려 로딩 스피너를 보게 되고, 크롭된 부분을 보여주는 것이 목적이므로
  해상도를 올릴 이유가 없다
- ⚠️ **탭할 수 있다는 힌트가 필요하다** — 크롭된 화면은 잘렸다는 티가 나지 않아, 없으면 아무도
  누르지 않는다. 우하단에 작은 확장 아이콘(`Maximize2`) 하나를 둔다
- `posterPath`가 없으면 **탭을 비활성화**한다(폴백 그라데이션을 확대해 봐야 의미가 없다)
- 접근성: `accessibilityRole="imagebutton"` · `accessibilityLabel="포스터 전체 보기"`.
  Android 뒤로가기는 `Modal`의 `onRequestClose`로 받는다

🔖 **백로그 — 핀치 줌·패닝**(2026-09-10). 필요한 기능이라고 보되 지금은 넣지 않는다.
`react-native-gesture-handler`가 **직접 의존도 전이 의존도 아니어서 새 네이티브 패키지가
추가**되고, 경계 클램프·더블탭 줌·닫을 때 리셋 등 잔손이 많아 반나절~하루가 든다.
포스터는 문서가 아니라 그림이라 확대해 읽을 것이 사실상 없다는 점도 함께 고려했다.

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
| **리뷰 쓰기** | 별도 모달 → 저장 | `PUT /api/movies/{id}/review` (upsert). ⚠️ **텍스트만** — 별점은 시청 기록에서 가져온다(§7.3) |

- **기록과 리뷰를 한 폼에 섞지 않는다.** 기록은 회차별 여러 개, 리뷰는 영화당 1개다.
- 기록 모달 필드: `watchDate`(**선택** — "기억 안 남" 허용), `watchType`, `ottPlatformId`
  (watchType이 OTT일 때만·필수), `placeDetail`, `rating`(선택), `note`
- 회차가 2개 이상이면 목록으로 보여주고 `PATCH .../representative`로 대표 지정
- 컬렉션 추가는 불린 토글이 아니라 **어느 컬렉션인지 고르는 시트**여야 한다
- 날짜: `<input type="date">` → `@react-native-community/datetimepicker`
  (Android `DateTimePickerAndroid.open()` / iOS 인라인 — 플랫폼 분기)
- 별점: 별 5개 반개 단위, 저장 시 ×2 (§7.3). **같은 별 재탭 시 해제** 가능하게 할 것.
  ⚠️ **별점 입력은 이 모달에만 있다** — 리뷰 모달에는 두지 않는다(§7.3)
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
- **스크롤 시 툴바 접기 — 구현한다** (2026-09-02 확정, 종전 "M2에서 생략"에서 변경).
  ⚠️ **접는 대상은 화면 안 툴바(그리드/리스트 토글)뿐이고, 네이티브 스택 헤더는 그대로 둔다.**
  네이티브 헤더는 플랫폼 뷰(UINavigationBar / Toolbar)라 `translateY`로 부드럽게 움직일 수
  없고, `headerShown` 토글은 뚝 끊기는 전환이다. 헤더까지 접으려면 `headerShown: false` +
  뒤로가기·SafeArea를 직접 구현해야 해서 이번 범위에서 제외했다.
  구현 방식은 `M2B-screens-spec.md` §5.5 참고 — **Reanimated UI 스레드 애니메이션**을 쓴다.

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

**List** — 카드 = **선반 위 포스터 진열**(최대 5) + 이름/편수. `GET /api/users/{myId}/collections`.
와이어프레임의 포스터 5칸 나열을 *"서재에 DVD를 전시한 모습"* 으로 발전시킨 것이다
(2026-09-09 확정 — 시안 3안 중 **뉴트럴 렛지**. 구현 설계는 `M2C-screens-spec.md` §5.2).

⚠️ **`CollectionResponse`에 포스터 목록이 없다** (`{id, name, description, movieCount, createdAt, updatedAt}`).
그리려면 컬렉션마다 `getCollectionMovies`를 호출해야 한다 → **N+1 요청**(컬렉션 20개면 HTTP 21회).
→ **B-6**(미리보기 포스터 필드)을 백엔드에 요청한다.

★ **그때까지는 빈 선반으로 둔다.** 빈 선반은 영화 0편인 컬렉션과 같은 모습이라 어색하지 않으므로,
**카드를 먼저 완성하고 필드가 오면 포스터만 얹는다** — 대기 시간이 없다. 이것이 이 디자인을
택한 결정적 이유다.
⚠️ **부족분을 빈 회색 슬롯으로 채우지 않는다** — 선반 위에서는 로딩 실패처럼 보인다.

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

> ⚠️ Expo SDK 57 / RN 0.86 / React 19.2는 최신이다. **`npx expo install`로 SDK 호환 버전이
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
| **B-18** | **컬렉션 목록·컬렉션 영화 목록의 정렬 미지정** | `CollectionRepository.findByUserId` · `CollectionMovieRepository.findByCollectionId`에 `OrderBy`가 없다(위시는 `findByUserIdOrderByIdDesc`로 있다) | 정렬 추가. **정렬 없는 페이징은 페이지마다 순서가 달라도 규약 위반이 아니어서 무한스크롤에서 중복·누락이 난다** — 20개 미만에서는 재현되지 않아 데이터가 쌓인 뒤 터진다 | 2군 (차단은 아님) |
| **B-19** | **컬렉션 내 영화 순서 지정 불가** | `CollectionMovie`에 순서 컬럼이 없다 — 담긴 순서가 사실상 PK/생성 순서로 고정 | 순서 컬럼(예: `position`) + 저장 엔드포인트 신설. 실기기 검증 중 드래그 정렬 요청을 받았으나 저장할 곳이 없어 보류 | 2군 (차단은 아님 — "순서 바꾸기"만 막는다) |
| B-12 | 검색 정렬·필터 | `query`/`year`만 지원 (잔여 #22) | 장르 필터·정렬 UI는 불가 | 낮음 |
| **B-13** | **OTT 플랫폼 목록 조회 API 없음** | `WatchRecordCreateRequest.ottPlatformId`는 필수인데 유효 ID를 얻을 방법이 없다 | `OttPlatformResponse`를 반환하는 목록 엔드포인트 추가 | 1군 (상세 화면 — 지금은 `watchType=OTT` 저장을 막고 THEATER/ETC만 지원) |
| B-14 | 상세 히어로 배경 | `MovieDetailResponse`에 `backdropPath` 없음(`posterPath`만) | 필요하면 필드 추가 — 없어도 `posterPath`로 우회 가능 | 낮음 |
| **B-17** | **랜덤 영화 조회 API 없음** | `GET /api/movies`는 `findAll(pageable)`이 정렬 미지정이라 **매번 같은 목록**이 나온다(5-0-D가 클라이언트 `sort`를 의도적으로 미지원) | **`GET /api/movies/random?size=`** 신설 — `poster_path IS NOT NULL` 필터 포함. 설계 확정본은 **백엔드 docs**(`controller-layer-spec.md` 5-2 · `service-layer-spec.md` 4-2) | **1군 (홈 배경).** 없으면 게스트 배경이 **항상 같은 영화**가 된다 |
| ~~B-15~~ | ~~시청 기록 수정 API 없음~~ | ✅ **백엔드 완료(`PATCH /api/records/{recordId}`), 프론트 연동 완료** — `gen:api` 재생성 확인(2026-09-04) | 없음 | — |
| ~~B-16~~ | ~~`review.rating` 제거 + 별점 파생~~ | ✅ **백엔드 완료(`ReviewWriteRequest`에서 `rating` 제거 확인), 프론트 연동 완료**(`ReviewModal` 별점 입력 제거) — `gen:api` 재생성 확인(2026-09-02) | 없음 | — |

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

### 11.2 B-15 — 시청 기록 수정 API

**설계 확정본은 백엔드 문서에 있다.** 이 문서는 화면 쪽 귀결만 다룬다.

| 문서 | 내용 |
|---|---|
| `cinemory-backend/docs/controller-layer-spec.md` **5-3-A** | `PATCH /api/records/{recordId}` → 200 `WatchRecordResponse`, 검증 분담, 전체 치환 의미론 |
| `cinemory-backend/docs/service-layer-spec.md` **4-3** | `updateWatchRecord` 로직, 대표 재조율을 하지 않는 이유 |
| `cinemory-backend/docs/jpa-entity-spec.md` **5) WatchRecord** | `update(...)` 도메인 메서드, setter를 열지 않는 이유 |

**프론트가 알아야 할 것 셋**

1. **`PATCH /api/records/{recordId}` → 200 `WatchRecordResponse`.** 응답에 갱신된 DTO가 오므로
   재조회 없이 캐시를 갱신할 수 있다.
2. ⚠️ **전체 치환이다 — 생략한 필드는 `null`로 지워진다.** 편집 폼은 **항상 전체 필드를 실어
   보낸다.** 부분 전송하면 사용자가 입력한 적 없는 필드까지 지워진다.
3. ⚠️ **대표 기록의 `rating`을 수정하면 공개 리뷰의 별점도 바뀐다**(§7.3의 파생 규칙).
   무효화에 **`['reviews']`를 포함**한다 — `M2B-screens-spec.md` §3.2.

---

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

## 12. 단계별 실행 순서

각 단계의 **실행 순서 · 파일 단위 지시 · 검증 절차**는 단계 문서에 있다(「📚 문서 구성」).
이 절은 그 색인이다.

| 단계 | 문서 | 상태 |
|---|---|---|
| **M2-A** 기반 | **`M2A-foundation-spec.md`** | ✅ 완료 (2026-08-30) |
| **M2-B** 1군 화면 | **`M2B-screens-spec.md`** | ✅ 완료 (2026-09-06) |
| **M2-C** 2군 화면 | (M2-B 완료 후 작성) | ⬜ 착수 대기 |
| **M2-D** 3군 화면 | (백엔드 차단 해소 후) | 🔒 §11 |

**모든 단계에 공통으로 적용되는 원칙**

> **뼈대가 끝까지 도는 것을 먼저 확인하고, 그 다음에 내용을 채운다.**
> M2-A에서는 *"화면 내용보다 네비게이션이 먼저"* 였고, M2-B에서는 *"화면 레이아웃보다
> 데이터 흐름(훅 → 로딩/에러/빈 상태)이 먼저"* 다. 순서를 뒤집으면 나중에 전부 다시 손댄다.

> 📌 이 절에 있던 M2-A 11단계 상세는 `M2A-foundation-spec.md`로 옮겼다.
> **끝난 단계의 실행 순서가 우산 문서에 남아 있으면 죽은 섹션이 된다**(「📚 문서 구성」).

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
| Expo SDK 호환 | 확인 필요 | ⚠️ SDK 56 시점에 config plugin이 깨짐 (`@expo/config-plugins` 경로 문제). 워크어라운드: `npx expo install @expo/config-plugins`. **현재 스택은 SDK 57이므로 착수 시 재확인 필요** |

> 좌표를 백엔드가 공급하므로 앱의 지도는 "아는 좌표에 마커 찍기"만 합니다. 카카오의 POI 검색 정확도는 이미 백엔드에서 확보된 상태라, 렌더링 레이어 선택은 **지도 배경 품질**과 **Expo 호환성**만 보고 판단하면 됩니다.

### 13.6 판단 시점

- **결정 시점**: M2-C에서 a안을 실기기로 만져본 뒤. 추측으로 prebuild를 결정하지 않습니다.
- **전환 적기**: M3 초입 — M2 화면이 모두 끝나 회귀 테스트 범위가 명확해진 시점.
- **중요**: prebuild 결정을 지도 하나로 내리지 마세요. 카카오 로그인·푸시 알림 등 다른 네이티브 요구가 생기면 어차피 필요하므로, **묶어서 한 번에 전환하는 것이 총비용이 낮습니다.**

---

## 변경 이력

| 날짜                 | 내용 |
|--------------------|---|
| 2026-09-10 (이어서 4) | **§8.6 신설 — 진입 직후 빠른 뒤로가기 시 빈 화면 버그 해결.** `M2B-screens-spec.md` §5.4에 `MovieDetail` 전용 문제로 백로그 등록됐던 건이 실은 **모든 화면의 뒤로가기에서 재현**되는 native-stack 전체 문제로 확인돼 여기(네비게이션 절)로 옮겨 기록한다. `freezeOnBlur`·`headerTransparent` 끄기·`animationDuration` 단축은 효과가 없거나 부분적이었고, `detachPreviousScreen`은 native-stack에 개념 자체가 없어(JS 기반 `@react-navigation/stack` 전용) 시도조차 불가능했다. **`animation: 'none'`으로 사라지는 것으로 push/pop 전환 애니메이션 경합을 확정**한 뒤, 애니메이션은 유지한 채 그 시간 창의 뒤로가기만 `beforeRemove`로 막는 `src/navigation/backGuard.ts`를 신설해 해결 — 실기기 확인 완료. 겸사겸사 4개 스택에 복붙돼 있던 `MovieDetail` 옵션을 `movieDetailScreenOptions.ts`/`defaultStackScreenOptions.ts`로 추출했다. 상세 경위는 `docs/DevLog.md` 2026-09-10, `M2B-screens-spec.md` §5.4·변경 이력 참고 |
| 2026-09-10 (이어서 3) | **§9.3에 "내 별점" 크게 표시 신설 — 제목 아래, 정보 카드 위.** 리뷰를 안 써도 시청 기록만 있으면 뜨도록 `watchLog`에서 직접 대표 기록의 별점을 뽑는다(§7.3의 2단계 폴백과 동일 규칙 — 리뷰의 파생 별점과 다른 자리에 같은 규칙을 다시 구현한 것일 뿐 새 규칙은 아니다). **§7.4의 B-4(집계 평점, 아직 차단)와는 다른 데이터**임을 명시해 뒀다 — "내가 매긴 별점"은 이미 있는 시청 기록 데이터라 백엔드 선행 없이 바로 가능했다. 비용이 작았던 이유는 데이터(`watchLog`, 이미 이 화면이 불러옴)와 컴포넌트(`RatingStars`, 크기만 키워 재사용) 둘 다 이미 있었기 때문. 상세는 `M2B-screens-spec.md` 변경 이력 2026-09-10 |
| 2026-09-10 (이어서 2) | **§9.3 히어로 크롭 비율 1:1 → 4:5 롤백 + 캐스트 여백 확대.** 직전에 1:1로 낮췄던 것을 실기기에서 "포스터 비중이 너무 줄었다"는 피드백을 받아 **4:5로 되돌렸다.** 정보 박스 노출(4:5는 58%로 살짝 부족)과 포스터 비중 사이의 정확한 지점은 **사용자가 추후 직접 미세조정**하기로 하고 미결로 남겼다. 출연진 첫 아바타 좌측 잘림은 `paddingLeft`를 3→8로 늘려 재조정. 상세는 `M2B-screens-spec.md` 변경 이력 2026-09-10 |
| 2026-09-10 (이어서)   | **§9.3 히어로 크롭 비율 4:5 → 1:1 조정 + 실기기 수정 2건.** 4:5(390px 기기 기준 487px, 화면의 58%)로도 기본 정보 박스가 첫 화면에 다 들어오지 않는다는 실기기 확인을 받아, 검토했던 세 안 중 마지막인 **1:1(46%)** 로 낮췄다 — "포스터 느낌이 옅어진다"는 우려보다 **정보가 스크롤 없이 보이는 것**을 우선했다. 함께 ① **포스터 전체 보기의 배경 탭-닫기를 없애고 명시적 닫기 버튼**을 뒀다(포스터를 자세히 보려는 화면에서 탭하면 닫히는 게 불편하다는 지적) ② **출연진 첫 아바타가 가로 스크롤 경계에 붙어 왼쪽이 살짝 잘리던 것**을 `paddingLeft`로 해결했다. 상세는 `M2B-screens-spec.md` 변경 이력 2026-09-10 |
| 2026-09-10         | **§9.3 히어로 재설계 — 이음매를 다듬지 않고 없앤다 + 포스터 전체 보기 신설.** 배경 이미지를 없애고 포스터를 화면 폭으로 키운 뒤 `expo-blur`로 하단을 이으려 했으나 **경계가 계속 남는다**는 보고에서 출발했다. 원인을 셋으로 분해했다 — ① **`BlurView`의 `intensity`는 뷰 전체에 균일**하므로 세기가 다른 밴드를 쌓으면 **경계마다 가로줄**이 생긴다(기법을 `blurRadius`→`BlurView`로 바꿨어도 *잘라 겹치는 구조*가 그대로라 계단도 그대로였다) ② 맨 위 밴드의 **상단 하드 엣지**는 강도를 낮춰도 안 없어진다 ③ ★ **진짜 범인은 값 반전** — 그라디언트가 `투명 → 검정 60% → #FFFFFF`라 마지막 구간이 **탁한 회색 띠**가 된다. **핵심 발견은 이음매 문제와 기본 정보 배치 문제가 같은 문제라는 것**이다 — *제목을 포스터 위에 얹는다 → 흰 글씨가 필요하다 → 어두운 스크림이 필요하다 → 흰 배경으로 이어질 때 값이 반전된다.* 그래서 **텍스트를 히어로 밖(가운데 정렬)으로 빼서 사슬을 끊고**, 포스터를 `colors.background` 바로 그 색으로 페이드해 **이을 경계 자체를 없앴다.** 부수적으로 **`expo-blur` 의존이 사라진다**(이 화면이 유일한 사용처였다). 함께 정한 것 셋 — ⓐ **4:5 상단 기준 크롭**: 2:3 full-bleed는 390px 기기에서 585px(**화면의 69%**)라 장르·감독·출연이 전부 스크롤 밖이었다. ⚠️ `resizeMode="cover"`는 **가운데 기준**이라 인물·타이틀이 있는 위쪽이 잘리므로, 원본 비율 이미지를 `top: 0`에 두고 컨테이너로 **아래쪽만** 자른다(잘리는 구간은 페이드가 덮는다). ⓑ **히어로 탭 → 포스터 전체 보기** — 크롭했기 때문에 비로소 의미가 생긴 기능으로 **두 결정이 서로를 정당화한다.** `w780`을 재사용하므로 **추가 다운로드 0, 탭하면 즉시** 뜬다(`original`은 2~4MB라 오히려 스피너를 보게 된다). ⚠️ 크롭된 화면은 잘렸다는 티가 안 나므로 **우하단 확장 아이콘으로 탭 가능함을 알린다.** ⓒ **핀치 줌은 백로그** — 필요하다고 보되 `react-native-gesture-handler`가 직접·전이 의존 어느 쪽도 아니어서 **새 네이티브 패키지가 추가**되고 잔손이 많다. **검토했으나 택하지 않은 둘도 근거와 함께 남겼다** — 마스크 연속 블러(`@react-native-masked-view`)는 계단은 없애지만 **이 화면만 다크 테마**가 되고, 텍스트 그림자 방식은 **포스터 하단이 밝으면 흰 글씨가 죽어** 포스터 색에 운을 맡기게 된다 |
| 2026-09-10         | **§9.1 ② 로고를 입체 압출로 개정 — `OutlinedText` → `ExtrudedText`.** 의도는 처음부터 *애스터로이트 시티* 풍 입체 타이포였는데 와이어프레임이 쓴 4방향 `text-shadow`가 **압출이 아니라 오프셋 인쇄 오차**로 보인다는 지적에서 출발했다. 원인을 넷으로 분해했다 — ① **4방향 대칭이라 깊이 방향이 없다**(입체는 광원이 하나이므로 그림자도 한 방향) ② **좌상만 `brandDeep`, 나머지 셋이 `brandLight`** 라 판이 밀린 것처럼 보인다 ③ 56px에서 2px는 얇다 ④ **오프셋을 한 번만 찍어 불연속**이라 면이 안 생긴다. → **한 방향(↘)으로 1px씩 연속으로 쌓는 진짜 압출**로 바꿨다. 깊이는 **6px(11%)로 시작했다가 3px(5.5%)로 내렸다** — 대각선 압출이 6px에서 글자 사이를 메워 `M`·`y`가 뭉갰고, **↘는 눈에 보이는 두께가 `depth × √2`(3px→약 4.2px)** 라 3px로도 충분하다는 것이 시안 비교로 확인됐다. **키라인(맨 뒤 1겹)은 `brandLight` 채택**, `shadowDeep`(≈`#1F7A72`)은 **보류 기록**했다 — 둘은 성격이 반대여서(`brandLight`=밝은 테두리·튀어나옴 / `shadowDeep`=그림자·물러남) 배경에 따라 유불리가 갈린다. `brandLight`는 **새 토큰이 없고**, 4방향 시절 흩어져 문제를 만들던 그 색을 **제 역할로 옮기는 것**이라 택했다. ⚠️ **다만 흰 배경(스플래시·로그인)에서는 `#DBF5F0`이 거의 안 보이므로, 로고를 그 화면에 쓰기 시작하면 재검토**한다 — 그래서 **키라인 색을 컴포넌트에 박지 않고 prop으로 뺐다**(전환을 인자 하나로 끝내려는 것, 선반 토큰과 같은 처리). 함께 못박은 것 셋 — **깊이는 px 상수가 아니라 `fontSize × 0.055`, 최소 2겹 보장**(작은 크기에서 1겹이 되면 압출이 아니라 드롭섀도가 된다), **그리는 순서가 이전과 반대**(가장 먼 층이 먼저 — 기존 `CORNERS` 역순 규칙이 그대로면 키라인이 본체를 덮는다), **본체 외 전 층 접근성 숨김**(스크린 리더가 다섯 번 읽는 문제는 그대로 유효). 레이어 수는 5겹으로 **기존과 동일**해 성능 변화가 없다. **폰트는 미결로 남겼다** — 압출이 얇아진 만큼 글자 무게의 영향이 커졌으나, `expo-font` 도입은 `useFonts` 로딩을 `authStore.restore()`와 합류시키는 작업이 딸려 온다 |
| 2026-09-10         | **§11에 B-19 추가 — 컬렉션 내 영화 순서 지정 불가.** M2-C 실기기 검증 중 드래그로 컬렉션 영화 순서를 바꾸는 기능을 요청받았으나, `CollectionMovie`에 순서 컬럼이 없어 저장할 곳이 없다. 클라이언트만 순서를 바꾸면 재조회 시 되돌아가는 반쪽짜리 UI가 되므로 구현하지 않고 백엔드 요청으로 등록했다(2군, 차단은 아님 — 순서 바꾸기 기능 자체만 막는다). 항목 수 표기를 18건→19건으로 갱신(§0). 상세는 `M2C-screens-spec.md` §6·§8, 경위는 `DevLog.md` 2026-09-10 |
| 2026-09-09         | **M2-C 구현 완료 — 실기기 검증 전.** `M2C-screens-spec.md` §1 실행 순서 1~6번(collection API/훅 보강 → `Wishlist` → `CollectionList`/`Detail` → `MovieDetail` 컬렉션 연결)을 전부 구현했다. 착수 전 브랜치 상태를 점검하다 `feature/expo-57`(SDK 56→57 업그레이드, 실기기 검증 통과)가 작업 브랜치에 전혀 반영되지 않은 것을 발견 — 이 스펙이 이미 SDK 57을 전제하고 있어 그대로 진행하면 기기에서 실행조차 안 될 상태였다. `feature/expo-57`를 병합하고 `develop`에 M2-B+SDK57을 통합한 뒤 `feature/m2c-wishlist-collection`을 새로 잘라 그 위에서 진행했다(경위는 `docs/DevLog.md` 2026-09-09 참고). 상세 구현 내용은 `M2C-screens-spec.md` 변경 이력. `npx tsc --noEmit`·`expo export --platform android` 통과 확인, 실기기 검증(§7)은 아직이다 |
| 2026-09-09         | **M2-C 착수 — `docs/M2C-screens-spec.md` 신설, `Report`를 M2-C2로 분리.** 백엔드 컨트롤러 16개를 실제로 확인해 **리포트 도메인이 존재하지 않음**(B-8)을 재확인했고, 그대로 M2-C에 두면 **M2-C가 백엔드 M3-a가 끝날 때까지 영원히 "진행 중"** 이 되므로 분리했다 — M2-B가 B-4를 자리 비움으로 우회하고 완료 판정을 낸 것과 같은 처리다. 결과적으로 **M2-C의 블로커가 0이 됐다.** 이 갱신으로 「진행 현황」에 M2-C2 행을 신설하고 M2-C 범위를 `Wishlist`·`Collection`·`MovieDetail` 컬렉션 연결로 좁혔다. 함께 **B-18(컬렉션 목록·컬렉션 영화 목록의 정렬 미지정)** 을 §11에 추가했다 — 위시만 `OrderByIdDesc`가 있고 컬렉션 두 곳에는 없어 **페이지 경계에서 중복·누락**이 나는데 20개 미만에서는 재현되지 않는다. **§9.7 컬렉션 카드 디자인도 갱신** — 포스터 스트립 없이 이름+편수만 두기로 했던 것을 **"선반 위 포스터 진열"**(서재의 DVD 진열)로 바꿨다. 빈 선반이 그 자체로 성립해 **B-6을 기다리지 않고 선행 구현할 수 있다는 것**이 채택의 결정적 이유다. 설계는 `M2C-screens-spec.md` §5.2 |
| 2026-09-06         | **「📍 진행 현황」·§12 갱신 — M2-B 완료, M2-C 착수 대기로 전환.** `M2B-screens-spec.md` §7(§7.1·§7.2·§7.3) 실기기 검증이 전부 끝나 현재 위치 마커·단계 표·§12 색인을 갱신했다. B-4(상세 평점)는 여전히 미해소임을 명시해 뒀다 — M2-B가 "완료"인 것은 B-4를 화면 자리 비움으로 우회했기 때문이지 B-4 자체가 해소된 게 아니다. 근거는 M2-B 완료 근거 절 신설로 §7 결과 요약(§6.3 갱신 2건 포함 버그 4건)을 남겼다 |
| 2026-09-06         | **문서 전체의 스택 표기를 Expo SDK 57 / RN 0.86 / React 19.2로 갱신**(헤더 · §10 설치 주의). 업그레이드의 계기는 성능·기능이 아니라 **Expo Go가 SDK를 1:1로 고정**한다는 점이었다 — 프로젝트를 56으로 되돌려도 기기의 Expo Go가 57이면 열리지 않으므로 롤백은 해결책이 되지 못한다. **React가 19.2에서 움직이지 않았고** `svg`·`datetimepicker`·`nativewind`·`tailwindcss` 버전이 56과 동일해 화면 코드에 미친 영향은 없었다. 상세 근거와 버전 대조표는 `M2A-foundation-spec.md` §0.1 · §1 채택 결과 · 변경 이력 2026-09-06, 경위는 `docs/DevLog.md` 2026-09-06(이어서 5) |
| 2026-09-05         | **§6.3 에러 코드 표 정정 — `UNAUTHORIZED` 추가 + "표에 없으면 개입 없음" 명시.** `Settings`(§5.6, M2-B) 실기기 검증 중 `src/api/client.ts`의 401 인터셉터가 이 표와 **정반대로 구현돼 있던 것**을 발견했다 — "표에 있는 코드만 로그아웃"이 아니라 "`TOKEN_EXPIRED`가 아니면 전부 로그아웃"으로 짜여 있어, 비밀번호 변경 폼에서 현재 비밀번호를 틀리면(`401 INVALID_CREDENTIALS`) 폼 에러 대신 강제 로그아웃됐다. `/api/auth/login`의 `INVALID_CREDENTIALS`는 애초에 `/api/auth/` 접두사 예외로 인터셉터를 안 타서 이 표가 처음 작성됐을 때는 이 구현 오류가 드러나지 않았다. 코드를 표에 맞게 수정하면서(`SESSION_INVALID_CODES` 허용목록으로 전환), 표에 없던 `UNAUTHORIZED`(백엔드 `requireAuthenticated` 이중 방어 코드 — 정상 흐름에선 도달하지 않음)도 토큰 문제로 판단해 로그아웃 대상에 추가했다. 상세 경위는 `docs/DevLog.md` 2026-09-05 항목 |
| 2026-09-06         | **§9.1 홈 화면 배경 설계 확정 + B-17 등록.** M2-B 검증 완료 후 홈 화면을 와이어프레임에 맞춰 보완하기로 하면서 배경 포스터의 **소스를 로그인 여부로 나누기로** 확정했다 — 로그인 + 기록 12편 이상이면 내 기록, 그 외(게스트·기록 부족·0건)는 랜덤 영화. **12편 임계값은 80칸을 5장으로 채우면 반복이 눈에 띄기 때문**이고, **기록 0건 폴백은 가입 직후가 인상이 가장 중요한 순간인데 배경이 비어버리는 것**을 막기 위해서다. ⚠️ **게스트 소스에서 막혔다 — 랜덤 정렬 수단이 없다.** `getMovieList`가 `findAll(pageable)`이고 정렬을 지정하지 않아 사실상 PK 순으로 고정되며 5-0-D가 클라이언트 `sort`를 의도적으로 미지원으로 확정했다. 즉 그대로 쓰면 *"무작위"* 가 아니라 **"항상 같은 20편"** 이 된다. 검토한 우회 넷(A 클라이언트 랜덤 페이지 / B `size=100` 셔플 / C 백엔드 엔드포인트 / D 박스오피스 대체) 중 **C를 채택**했고, 결정적 이유는 **`poster_path IS NOT NULL` 필터가 서버에서만 가능**하다는 점이다 — A는 백엔드 변경이 0이지만 포스터 없는 영화가 섞여 배경에 빈칸이 생긴다. **D는 폴백으로 보류 기록**했다(변경 0이고 *"오늘의 박스오피스"* 라는 의미도 있으나 매칭률 90.7%라 `linked == false` 항목의 `posterPath`가 null이다). 설계 확정본은 백엔드 docs에 두고 여기엔 화면 요구사항만 남겼다. 함께 정한 것 셋 — **blur를 라이브러리 없이 해결**(`w92` 타일을 큰 셀에 넣어 업스케일로 뭉갠다. `expo-blur`는 Android 성능 이슈로 마지막 수단), **4방향 아웃라인은 텍스트 5겹**(RN `Text`는 `textShadowOffset`이 하나뿐), **배경 4겹의 접근성 숨김**(안 걸면 스크린 리더가 로고를 다섯 번 읽는다). 탭 이탈 시 애니메이션 정지와 로그인/로그아웃 시 배경 크로스페이드도 명시했다 |
| 2026-09-04         | **B-15·B-16 해소 확인.** 백엔드가 `PATCH /api/records/{recordId}`를 구현했다는 보고를 받고 `npm run gen:api`로 확인 — `WatchRecordUpdateRequest`(전체 치환, `movieId`·`representative` 제외)와 `updateWatchRecord` 오퍼레이션이 §11.2 설계 확정본 그대로 반영돼 있었다. 프론트도 연동 완료(실행 내역은 `M2B-screens-spec.md` 변경 이력 참고). 둘 다 §11 표에서 ✅ 완료로 갱신 |
| 2026-09-04         | **§11에 B-15 추가.** `MovieDetail` 실기기 재검증 중 발견 — 시청 기록에 update API가 없다. `POST /api/records`·`DELETE /api/records/{id}`·`PATCH .../representative`뿐이라 잘못 기록한 시청 기록(날짜·방식·장소·별점·메모)을 고칠 방법이 없다. 삭제 후 재생성하는 우회안을 검토했으나, §7.3의 "새 기록 INSERT 시 대표 자동 승격" 규칙 때문에 대표가 아니던 기록을 이 방식으로 "수정"해도 재생성 순간 대표로 바뀌는 부작용이 있어 채택하지 않고 백엔드에 `PATCH /api/records/{recordId}` 신설을 요청하기로 했다. 항목 수 표기를 14건→15건으로 갱신(§0) |
| 2026-08-31         | **§11에 B-13·B-14 추가.** `MovieDetail` 구현 중 새로 드러난 백엔드 갭 2건. **B-13(1군, 상세 화면 블로커)** — OTT 플랫폼 목록을 조회하는 엔드포인트가 없다. `WatchRecordCreateRequest.ottPlatformId`는 `watchType=OTT`일 때 필수인데 유효한 ID를 얻을 방법이 없어, 지금은 프론트에서 `watchType=OTT` 저장 자체를 막고 안내만 띄운다(THEATER/ETC만 동작). **B-14(낮음)** — `MovieDetailResponse`에 `backdropPath`가 없다(`posterPath`만 있음). 상세 화면 히어로 배경은 `posterPath`로 대신 렌더한다. 항목 수 표기를 12건→14건으로 갱신(§0) |
| 2026-09-02         | **§9.4 — "스크롤 헤더 숨김 M2 생략" 결정을 되돌려 툴바 접기를 구현 범위에 넣었다.** 종전 판단은 *"정렬·필터 UI를 없앴으므로 숨길 헤더도 없다"* 였으나, 실기기에서 써 보니 **그리드/리스트 툴바가 목록 상단을 계속 차지**해 접기 요구가 생겼다. ⚠️ **접는 대상을 툴바로 한정한 것이 이번 결정의 핵심이다** — `MyRecords`에는 헤더가 둘(네이티브 스택 헤더 + 화면 안 툴바)인데, **네이티브 헤더는 플랫폼 뷰라 `translateY`로 부드럽게 움직일 수 없고** `headerShown` 토글은 뚝 끊긴다. 헤더까지 접으려면 `headerShown: false` + 뒤로가기·SafeArea 직접 구현이 따라붙어 범위가 커진다(확보 공간 ~100px vs ~40px). 위험 0인 쪽을 택했다. 구현 상세는 단계 문서로 넘겼다(`M2B-screens-spec.md` §5.5) |
| 2026-09-02         | **§11.2를 설계 확정본에서 포인터로 축약 — 백엔드 설계는 백엔드 문서에 둔다.** 전날 B-15 설계를 이 문서 §11.2에 상세히 적었는데, **백엔드 스펙이 프론트 문서에 사는 상태**가 되어 혼동을 낳았다. `cinemory-backend/docs/`의 `controller-layer-spec.md` 5-3-A · `service-layer-spec.md` 4-3 · `jpa-entity-spec.md` 5) WatchRecord에 **각 문서의 기존 구조와 번호 체계에 맞춰 반영**하고(변경 이력 포함), 여기에는 위치 안내와 **프론트가 알아야 할 것 셋**만 남겼다 — ① 응답이 `WatchRecordResponse`라 재조회 없이 캐시 갱신 가능 ② **전체 치환이므로 편집 폼은 항상 전체 필드를 실어 보낸다** ③ 대표 기록의 `rating` 수정이 공개 리뷰 별점을 바꾸므로 `['reviews']` 무효화 필요. 「📚 문서 구성」의 *"같은 층의 같은 사실을 두 문서에 적으면 반드시 어긋난다"* 를 리포 경계에도 적용한 것이다 — **백엔드 계약의 단일 출처는 백엔드 리포다**(`CLAUDE.md` 규칙과도 일치). 확인 과정에서 **B-16(`review.rating` 제거 + 파생)은 이미 백엔드 문서 네 곳에 전부 반영돼 있음**을 확인했다 |
| 2026-09-01         | **B-15(시청 기록 수정 API) 설계 확정 — §11.2 신설, §5.3·§11 반영. B-16 등록.** 상세 화면 사용 중 **잘못 입력한 시청 기록을 고칠 방법이 없다**는 것이 드러났다(생성·삭제·대표 지정만 존재). B-15 항목 자체는 이미 등록돼 있었고 *"삭제 후 재생성은 대표 자동 승격 때문에 우회로 쓸 수 없다"* 는 근거도 적혀 있었으나, **메서드·바디·의미론이 미확정**이라 그대로 넘기면 구현이 갈렸다. 확정 사항 넷 — ① **`PATCH /api/records/{recordId}` → 200 `WatchRecordResponse`.** `PATCH /api/collections/{id}`와 같은 모양이고, 응답에 DTO를 담는 이유는 `representative`·`ottPlatform.name` 같은 파생·조인 필드 때문에 클라이언트가 재조회 없이 캐시를 갱신할 수 있어서다. ② **⚠️ 전체 치환 의미로 고정** — 시청 기록은 `movieId`를 뺀 **모든 필드가 nullable**이라 통상적 PATCH 의미(*"보낸 필드만 변경"*)를 쓰면 **"날짜를 지우고 싶다"를 표현할 방법이 없다.** `CollectionUpdateRequest`가 이미 같은 방식이고 편집 폼이 전체 필드를 들고 있어 클라이언트 부담도 없다. ③ **`movieId`·`representative`는 수정 대상에서 제외** — 전자는 다른 기록이고, 후자는 전용 엔드포인트가 이미 있어 두 경로가 같은 상태를 건드리면 진실이 갈린다. ④ **⚠️ `WatchRecord` 엔티티에 setter도 update 메서드도 없음을 코드로 확인**(`markAsRepresentative`/`unmarkAsRepresentative`뿐) — **도메인 메서드 `update(...)`를 추가하고 그 안에서 `validateRating`을 호출**해야 한다. setter를 열면 **생성 시에만 걸리던 검증이 수정 경로에서 조용히 우회된다.** **가장 놓치기 쉬운 것은 별점 파생과의 상호작용이다** — §7.3 확정으로 공개 리뷰의 별점이 대표 기록에서 파생되므로, **대표 기록의 `rating`을 수정하면 리뷰 별점도 바뀐다.** 무효화에 `['reviews']`를 넣지 않으면 화면에 옛 별점이 남는다. 함께 **B-16(`review.rating` 제거 + 파생)** 을 B 목록에 정식 등록했다 — §7.3에만 있고 추적 목록에 없어 누락될 위험이 있었다 |
| 2026-09-01         | **★ 별점의 단일 출처를 `watch_record.rating`으로 확정 — §7.3 전면 개정, §5.3·§9.3 반영.** `MovieDetail` 구현 중 **`watch_record`와 `review` 양쪽에 `rating`이 있어 "이 사용자의 이 영화 별점"이 정의되지 않는다**는 것이 드러났다. 백엔드도 같은 문제를 **R-1(M3 블로킹 미결)** 로 이미 등록해 둔 상태였다(*"`watch_record`에도 `rating`이 있으나 쓰이지 않고…"*) — 프론트가 UI 쪽에서 같은 지점을 만난 것이다. 코드로도 확인했다: `watch_record.rating`은 `WatchRecordService`에서 **저장만 되고 어디서도 읽히지 않으면서** `UserMovieListItemResponse.rating`으로 화면에는 표시되고 있었다. **`review.rating` 컬럼을 제거하고 리뷰는 대표 시청 기록의 별점을 참조해 표시만 한다**(저장하지 않으므로 동기화 문제가 원천적으로 없다). **이 결정으로 R-1이 대표 기록 기준으로 자동 확정된다** — 리포트 2-4의 `FROM review r` 집계가 성립하지 않게 되므로 `FROM`/`JOIN` 절이 바뀐다(가중치 공식은 그대로). **가장 중요한 발견은 2단계 폴백의 필요성이다** — 새 `watch_record` INSERT 시 **대표가 자동 승격**되고(기획노트 3-(3)) `rating`이 nullable이라, **별점 없이 재관람 기록만 추가해도 예전 리뷰의 별점이 사라진다.** 사용자가 원인을 추적할 수 없는 유형이라 버그로 보인다. `대표 기록 → (null이면) rating 있는 가장 최근 기록 → 없으면 별점 없음` 폴백으로 막는다. 두 규칙 모두 **인덱스가 이미 있다**(`idx_watch_record_representative`, `idx_watch_record_user_id_movie_id_id`) — 백엔드가 이 조회 패턴을 미리 예상해 둔 것이다. ⚠️ **조인은 `LEFT JOIN`이어야 한다** — `INNER JOIN`이면 시청 기록 없이 쓴 리뷰(기획노트 2-3이 허용)가 목록에서 통째로 사라진다. 별점을 매긴 재관람을 추가하면 공개 리뷰의 별점도 함께 바뀌는 것은 **의도된 동작으로 못박았다** — 파생값의 본질이고 대안(작성 시점 스냅샷)은 다시 동기화 문제를 만든다. **텍스트는 두 곳으로 남는다**(`note` = 회차별 메모, `content` = 영화당 공개 리뷰) — 값이 아니라 글이라 "어느 게 진짜냐"가 생기지 않으므로 통합하지 않고, 화면에서 성격 차이를 드러낸다. `review` 테이블은 지금 최대 12행이라 마이그레이션 비용이 사실상 0이며, **지금이 손대기 가장 싼 시점**이다 |
| 2026-08-30         | **★ 게스트 우선 전환 확정 — §6.7 신설, §1·§6.4·§8.2 개정.** M2-B 검색 화면 구현 중 **스펙의 비로그인 시나리오와 `RootNavigator`의 로그인 게이트가 모순**임이 드러났다. 백엔드는 `service-layer-spec.md` 4-6에서 *"비로그인(`viewerId == null`) 조회 허용 — null을 예외가 아닌 정상 입력으로 다룬다"* 를 확정했고 `SecurityConfig.PUBLIC_GET_ENDPOINTS`가 영화·극장·박스오피스·타인 공개 데이터를 이미 열어뒀는데, **프론트는 `status !== 'authenticated'`면 `AuthNavigator`로 보내 게스트가 검색 화면에 도달조차 못 했다.** 둘 다 틀리지 않았고 화해되지 않은 상태였으며, 스펙이 백엔드 계약을 프론트 노출로 잘못 옮긴 것이 원인이다. **비로그인을 기본으로, 로그인을 선택으로 확정**했다. 핵심 구조 변경은 **인증을 모달로 빼는 것** — `RootNavigator`가 `status`로 `AuthNavigator`↔`MainTabNavigator`를 갈아끼우던 구조를 버리고 `Main`(항상) + `AuthModal`(`presentation: 'modal'`)로 바꾼다. 로그인 성공 시 **스택을 갈아끼우지 않고 모달만 닫으므로** 사용자가 있던 자리(검색 도중 찜을 누른 경우 등)를 잃지 않고, M2-A가 막으려던 사고(로그아웃 후 이전 사용자 화면이 스택에 남음)도 애초에 발생하지 않는다. 게이트는 **화면 게이트(`<AuthRequired>`)와 액션 게이트(`useRequireAuth()`)** 두 종류로 나눴다. ⚠️ **401 인터셉터에 게스트 가드가 필요하다** — 게스트는 토큰이 없어 인증 API에서 401을 받는데 현재 인터셉터가 refresh와 `logout()`을 시도해 무의미한 동작이 된다. 훅의 `enabled: isAuthed`가 1차 방어, 이 가드가 2차다. **로그인 후 원래 동작을 재생하는 것은 범위 밖으로 뒀다** — 대기 액션을 보관했다 실행하는 구조는 상태가 꼬이기 쉽고 지금 값이 크지 않다. **비용이 늘어나는 선택**임을 기록해 둔다 — 화면마다 게스트 분기가 붙고 선행 부품 2개와 네비게이션 재구성이 추가된다. 대안(로그인 게이트 유지)이 범위상 안전했으나 백엔드 설계와의 정합, 데모·앱스토어 심사 이점을 근거로 채택했다. 실행 계획은 `M2B-screens-spec.md` §0.1 |
| 2026-08-30         | **「📚 문서 구성」 규칙 신설 + §12를 색인으로 축약.** 단계마다 문서를 새로 만드는 방식(현행)과 스펙 문서 하나를 계속 고치는 방식 중 어느 쪽이 효율적인지 검토한 결과, **분리를 유지하기로 확정**했다. 근거 넷 — ① **수명이 다르다.** 단계 문서는 착수~검증까지만 뜨겁고 끝나면 아카이브지만 우산 문서는 M2 내내 읽힌다. 한 파일에 두면 죽은 내용이 산 내용을 밀어낸다(실제로 §12가 그 상태였다). ② **크기가 곧 비용이다.** 현재 우산 1,105줄 + M2A 1,005줄이고 M2-B·C까지 합치면 4,000줄이 되는데, CLAUDE.md가 *"작업 전에 관련 문서를 읽는다"* 로 지시하고 있어 매 세션 전량을 읽거나 부분만 읽고 놓치거나 둘 중 하나가 된다. ③ **동시 편집이 부딪힌다.** 역할 분담상 구현 중에는 Claude Code가 변경 이력을, 리뷰 시에는 내가 리뷰 결과를 쓴다. ④ **백엔드가 이미 같은 구조**다(단계별 spec 5종 + 기획노트가 우산) — 프론트만 다르게 갈 이유가 없다. **분리의 유일한 위험인 중복·표류는 판별 기준 한 줄로 막는다** — *"M2가 끝난 뒤에도 읽을 것인가?"* 그리고 **중복이 아니라 계층으로 나눈다**는 원칙을 명시했다(우산 §6.3 = 인증 계약 / M2A §4.2 = 인증 구현 코드). 참조는 **단계 → 우산 한 방향**으로만 걸어 죽은 링크가 쌓이지 않게 했고, **우산의 섹션 번호를 바꾸지 않는다**는 제약도 함께 박았다(단계 문서들이 §4·§5.2·§6.3·§11.1·§13을 참조 중). 함께 §12를 색인으로 축약하고 M2-A 11단계 상세는 단계 문서로 넘겼다 — 끝난 단계의 실행 순서가 우산에 남으면 죽은 섹션이 된다는 것이 이번 검토의 출발점이었다. 단계 공통 원칙(*"뼈대가 끝까지 도는 것을 먼저 확인하고 내용을 채운다"*)만 §12에 남겼다 |
| 2026-08-30         | **문서 상단에 「📍 진행 현황」 대시보드 신설.** M2-A~D 4단계를 범위·상태·백엔드 의존·상세 문서로 한 표에 모았다. v1에는 4단계 표가 §0에 있었으나 **v2 전면 개정에서 유실**됐고, 그 뒤로 단계 구분이 §2(화면 우선순위 1군/2군/3군)와 §11(백엔드 선행 항목)에 흩어져 전체 그림을 한눈에 볼 수 없었다. **섹션 번호를 붙이지 않은 이유**는 `M2A-foundation-spec.md`를 비롯한 다른 문서가 §4·§5.2·§11.1·§13 등을 참조하고 있어 번호를 밀면 전부 깨지기 때문이다. 함께 담은 것 — ① **현재 위치 마커**(M2-A 완료 → M2-B 다음) ② **M2-A 완료 근거**(실기기 A~D 통과 + 되돌리기 4건 확인) ③ **각 단계 진입 조건** — 특히 B-4는 화면 작업과 병렬 가능해 M2-B 착수를 막지 않는 반면 M2-D는 셋 다 백엔드 선행이 필수라는 구분 ④ **M2-B 도중의 prebuild 분기점** — 카카오 로그인 실기기 연결이 Expo Go를 못 쓰게 만드는 편도 전환이자 배포 트리거이며, 지도 SDK와 묶어 판단해야 한다는 경고. 함께 §1의 브랜치 행을 갱신했다(`main` 직접 커밋 → `develop` 전환 완료) |
| 2026-08-28         | **`docs/M2A-foundation-spec.md` 신설 — §12를 파일 단위로 상세화.** npm 레지스트리 실측으로 스타일링 판단 근거를 확보했다: `nativewind@4.2.6`은 `peerDependencies`가 `{tailwindcss:'>3.3.0'}` 하나뿐이라 **RN·React 버전에 대해 아무 선언이 없고**, `uniwind@1.11.0`은 `react-native>=0.81.0`·`react>=19.0.0`·`tailwindcss>=4`를 **명시**한다(이 프로젝트의 RN 0.85/React 19.2 포함). **NativeWind v4 채택 시 `tailwindcss@^3.4` 핀이 필수**임도 확인 — peer 범위가 최신 4.3.3을 형식상 통과시키지만 조용히 스타일이 안 먹는다. Expo 56 `bundledNativeModules.json` 대조로 필요한 네이티브 패키지가 전부 관리 대상임을 확인했다(`lucide-react-native`의 `react-native-svg ^15` peer 충돌 없음). §12 상단에 상세 문서 링크 추가 |
| 2026-08-28         | **B-1~B-3 정정 (§11, §11.1 신설).** 실제 설정 파일을 확인한 결과 **B-2·B-3는 이미 처리돼 있었다** — `nonce-ttl`은 `application.yml:73`에 `PT5M`이고 `application-secret.yml`에 오버라이드가 없다(런북의 검증용 `PT15M`은 이미 복구됨). CORS도 `8081`/`19006`이 등록돼 있고, 무엇보다 **RN 네이티브는 CORS 적용 대상이 아니다**(설정 파일 주석이 이미 정확히 짚고 있었다) — Expo 웹에서만 의미가 있어 1군 필수가 아니다. v2에서 셋을 묶어 *"전부 설정 한 줄"* 이라고 쓴 것은 파일을 확인하지 않고 기획노트 언급만 보고 옮긴 결과다. **B-1은 반대로 과소평가돼 있었다** — 설정값 추가 자체는 한 줄이 맞지만 **검증이 Dev Client 빌드에 묶여 있어 독립 작업이 아니다.** 특히 **키 해시가 콘솔 등록의 입력이 아니라 첫 빌드의 산출물**이라, 처음 제시한 *"콘솔 등록(2단계) → 나중에 prebuild(4단계)"* 순서는 키스토어가 없는 상태에서 해시를 요구하는 **순환**이었다. 2단계를 2a(패키지명·번들 ID·앱 키 — 지금)와 2b(키 해시 — 빌드 직후)로 분리했다. 키 해시는 *그 APK에 실제로 서명한 키* 기준이라 EAS 관리 키스토어 / 로컬 `debug.keystore` / **Play 앱 서명 키** 셋을 구분해야 하며, 마지막 것을 빠뜨리면 **개발 내내 정상이다가 스토어 배포 후에만 로그인이 깨진다**(M5 항목으로 등록). prebuild를 미루는 대안(`expo-auth-session` 브라우저 OIDC → `aud`가 이미 검증된 REST API 키로 유지)도 함께 적었으나, client secret이 활성화돼 있어 **백엔드에 code 교환 엔드포인트 추가가 선행**돼야 한다. **근거** — `cinemory-backend/src/main/resources/application.yml`·`application-secret.yml` 실측, `docs/kakao-login-runbook.md` 0단계·마지막 절, `docs/security-spec.md` L-7 |
| 2026-08-28         | **v2 전면 개정 — v1의 API 계약을 폐기하고 실제 백엔드 표면으로 교체.** v1은 *"백엔드가 미구현"* 이라는 잘못된 전제로 작성됐다(`CineMory_기획노트.md`와 `cinemory-backend/docs/`를 읽지 않고 와이어프레임만 보고 썼다). 실제로는 Step S·Step5 완료로 **컨트롤러 16개 + `/v3/api-docs`가 이미 존재**하며, 5-7 D에서 `openapi-typescript` 생성 파이프라인까지 검증돼 있었다. ① **손으로 쓴 도메인 타입 전체 삭제 → 생성 방식으로 전환**(§4). v1의 필드명은 거의 전부 실제와 달랐다(`MovieSummary.movieId` vs 실제 `MovieListItemResponse.id`, `posterUrl` vs `posterPath`, `genres: string[]` vs `GenreResponse[]` 등). ② **별점 스케일 정정** — v1은 사용자 1~5 / 외부 0~10으로 나눴으나 실제로는 `review.rating`·`watch_record.rating` **둘 다 Double 0.0~10.0**이다. 와이어프레임의 5점 별 UI를 쓰려면 ×2 변환이 필요하며, 범위 위반이 `@Valid`가 아니라 엔티티 `IllegalArgumentException` 경로로 나가 폼 에러 매핑에서 누락되기 쉬운 점을 §7.3에 명시. ③ **`watch_record` ↔ `review` 분리** — v1은 `WatchRecord`에 `review` 필드를 넣어 하나로 뭉쳤으나, 실제로는 회차별 비공개 기록과 영화당 1개 공개 리뷰로 **리소스가 다르다**. 화면에서도 "기록 남기기"와 "리뷰 쓰기"를 분리하도록 §9.3 개정. ④ **검색 계약 정정** — `{registered, suggestions}` 2섹션이며 `suggestions`에 `movieId`가 없는 것이 미등록 신호다. 미등록 선택 시 `POST /api/movies/sync`로 등록한 뒤 이동하는 플로우를 §9.2에 추가. `page`가 이 엔드포인트만 **1-based**인 점도 명시. ⑤ **§6 인증 전면 신설** — 백엔드가 **리프레시 회전 + 재사용 감지**를 구현하고 있어, 동시 401에서 각자 `reissue`를 호출하면 두 번째가 `REFRESH_TOKEN_REUSED`를 맞고 **전 세션이 폐기돼 사용자가 이유 없이 로그아웃된다.** 재현이 어려운 유형이라 **단일 비행(single-flight) 인터셉터**를 설계로 못박았다(§6.3). ⑥ **화면 우선순위를 기획노트 4-M2의 1군/2군/3군으로 교체**(§2) — v1의 임의 순서를 폐기. 3군(social·cinemap·recommend)이 뒤로 간 이유가 취향이 아니라 **백엔드 부재**임을 §11에 근거와 함께 정리했다. 특히 **와이어프레임 `SocialScreen`의 활동 피드에 대응하는 API가 아예 없다**는 것을 발견해(B-10) 피드 API 신설 대신 "팔로잉한 사람의 서재 보기"로 화면을 재설계하는 안을 권고했다 — 기존 API만으로 백엔드 추가 없이 구현된다. ⑦ **폴더 구조를 기획노트 6절의 도메인별 `screens/*/`로 교체**(§3). ⑧ **§11 백엔드 선행 항목 12건 신설** — B-1(카카오 네이티브 앱 키 `aud` 추가)·B-2(nonce TTL 복구)·B-3(CORS Expo origin)은 1군 착수 전 필수이며 셋 다 설정 한 줄이다. ⑨ TMDB 이미지 base URL을 `src/constants/tmdb.ts` 한 곳으로 못박고(§7.2) 기획노트가 지정한 `w185`/`w500`을 반영. ⑩ 지도 부록은 §13으로 이동하고 3군 표시를 붙였다. **근거** — `cinemory-backend/docs/controller-layer-spec.md`(858줄) 전문, `security-spec.md` S-2·S-3·S-J, `tmdb-sync-spec.md` 6-3·6-8·잔여 #24, 그리고 `src/main/java/` 실제 record 선언(문서보다 강한 근거로 채택) |
| 2026-08-27         | v1 작성 — `cinemory-wireframe` 16개 화면 분석 기반. **API 계약은 추정이었고 v2에서 폐기됨** |
