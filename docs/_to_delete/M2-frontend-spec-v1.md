# CineMory M2 — 프론트엔드 설계 스펙

> 대상: `cinemory-app` (Expo SDK 56 / RN 0.85 / React 19.2 / TypeScript)
> 기준: `cinemory-wireframe` (Figma Make 산출물, React + Vite + Tailwind v4)
> 이 문서는 **구현 스펙**입니다. Claude Code가 이 문서를 근거로 코드를 작성합니다.

---

## 0. 확정된 아키텍처 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 스타일링 | **NativeWind v4** (Expo 56 호환 실패 시 **Uniwind**로 대체) | 와이어프레임의 Tailwind 클래스를 그대로 이식 가능. 토큰/프리미티브로 격리해 교체 비용 최소화 |
| 네비게이션 | `@react-navigation/native-stack` + `bottom-tabs` (설치 완료) | 와이어프레임의 `useState` 조건부 렌더링을 스택으로 평탄화 |
| 지도 | **`react-native-webview` + Kakao Maps JS SDK** | 관리형 워크플로 유지(prebuild 불필요). 좌표는 백엔드가 공급 |
| 차트 | `react-native-gifted-charts` + `react-native-svg` | recharts(BarChart/PieChart) 대체 |
| 아이콘 | `lucide-react-native` | 와이어프레임이 쓰는 아이콘명을 그대로 유지 |
| 서버 상태 | `@tanstack/react-query` v5 | 로딩/에러/캐시/리페치를 훅 레벨에서 일괄 처리 |
| 인증 | **M2 범위에 포함** — `AuthStack` ↔ `MainTab` 분기 | 소셜·개인 기록이 핵심이라 필수 |
| 데이터 소스 | **목 어댑터 ↔ 실제 API 인터페이스 공유** | 백엔드 진행과 무관하게 화면 작업 병렬 진행 |

### 진행 단계

| 단계 | 산출물 | 백엔드 의존 |
|---|---|---|
| **M2-A 기반** | 토큰 · 프리미티브 · 네비게이션 골격 · 도메인 타입 · API 계약 · 목 어댑터 | 없음 |
| **M2-B 핵심 라인** | Login/SignUp · Home → SearchResult → MovieDetail → 기록 저장 · MyMovies · Calendar | 없음 |
| **M2-C 나머지** | Recommendation · Social · CineMap · Collection · Statistics · MonthlyReport | 없음 |
| **M2-D 연동** | 실제 API 스위칭 · 로딩/에러/빈 상태 · 토큰 갱신 | **있음** |

---

## 1. 폴더 구조

기존 빈 폴더(`src/api`, `src/hooks`, `src/components`, `src/navigation`, `src/store`, `src/theme`, `src/types`)를 아래로 확장합니다.

```
src/
├── api/
│   ├── client.ts             # axios 인스턴스 + 인터셉터(Authorization, 401 재발급)
│   ├── endpoints.ts          # 경로 상수 단일 출처
│   ├── auth.ts               # ★신규
│   ├── movie.ts   collection.ts   social.ts
│   ├── report.ts  recommend.ts    cinemap.ts   wishlist.ts
│   └── mock/                 # 각 api 모듈과 동일 시그니처의 목 구현
│       └── index.ts          # USE_MOCK 플래그로 실제/목 선택
├── components/
│   ├── primitives/           # Screen, Txt, Card, Button, Divider — 스타일링 격리 계층
│   ├── movie/                # PosterImage, MovieListItem, MovieGridItem, RatingStars
│   ├── calendar/             # CalendarView (compact/full 공용)
│   ├── chart/                # RatingBarChart, RatingPieChart
│   └── common/               # ScreenHeader, ActionSheet, EmptyState, ErrorState, LoadingState
├── hooks/                    # react-query 래퍼 (화면은 이 계층만 의존)
├── navigation/
│   ├── RootNavigator.tsx  AuthNavigator.tsx  MainTabNavigator.tsx
│   ├── stacks/               # HomeStack, RecommendStack, CineMapStack, SocialStack, MyPageStack
│   └── types.ts              # 전체 ParamList
├── screens/                  # 화면 1개 = 파일 1개 (와이어프레임 components/ 대응)
├── store/                    # zustand: authStore, uiStore
├── theme/                    # tokens.ts, colors.ts
└── types/                    # 도메인 모델 + DTO
```

**핵심 규칙**
1. 화면(`screens/`)은 `api/`를 직접 import하지 않습니다. 반드시 `hooks/`를 경유합니다.
2. 화면은 `theme/tokens.ts`와 `components/primitives/`만 통해 스타일을 씁니다. 색상 리터럴(`#14d9d9`) 직접 사용 금지.
3. 화면 간 데이터 전달은 **엔티티 객체가 아니라 ID**로 합니다. (와이어프레임의 최대 문제점, §6.0 참조)

---

## 2. 디자인 토큰

`cinemory-wireframe/src/styles/theme.css`의 `:root`를 이식합니다. 다크모드는 M2 범위 밖이나, 토큰 구조는 확장 가능하게 둡니다.

```ts
// src/theme/tokens.ts
export const colors = {
  background: '#FFFFFF',
  foreground: '#252525',          // oklch(0.145 0 0) 근사
  card: '#FFFFFF',
  primary: '#14D9D9',             // CineMory 시그니처 시안
  primaryForeground: '#FFFFFF',
  muted: '#ECECF0',
  mutedForeground: '#717182',
  accent: '#E9EBEF',
  destructive: '#D4183D',
  border: 'rgba(0,0,0,0.1)',
  inputBackground: '#F3F3F5',
  star: '#FACC15',                // 별점 노랑 (tailwind yellow-400)
} as const;

export const radius = { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 } as const;  // --radius: 0.625rem = 10
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '600' },
  h2: { fontSize: 20, fontWeight: '600' },
  h3: { fontSize: 16, fontWeight: '600' },
  h4: { fontSize: 15, fontWeight: '500' },
  body: { fontSize: 14, fontWeight: '400' },
  caption:{ fontSize: 12, fontWeight: '400' },
} as const;

export const layout = {
  tabBarHeight: 64,               // 와이어프레임 h-16
  posterAspectRatio: 2 / 3,       // 전 화면 공통
  screenPadding: 16,
} as const;

// 포스터 이미지 부재 시 폴백 색상 팔레트 (와이어프레임의 8색 순환)
export const posterFallbackPalette = [
  '#4A90E2', '#7B68EE', '#FF69B4', '#FFD700',
  '#FF6347', '#32CD32', '#9370DB', '#FF8C00',
] as const;
```

> **폴백 규칙**: 와이어프레임은 포스터를 전부 그라데이션 색상으로 대체했습니다. 실제 앱에서는 `PosterImage` 컴포넌트가 `posterUrl`이 있으면 이미지를, 없으면 `posterFallbackPalette[movieId % 8]` 그라데이션을 렌더링합니다. **색상은 랜덤이 아니라 `movieId` 기반 결정론적**이어야 재렌더 시 깜빡이지 않습니다.

---

## 3. 도메인 타입 (`src/types/`)

와이어프레임은 화면마다 영화 객체 모양이 달랐습니다(`id: number` vs `string`, 임의 폴백값 주입). 아래 타입을 **단일 출처**로 고정합니다.

```ts
// src/types/movie.ts
export interface MovieSummary {          // 리스트·그리드·검색결과용 (경량)
  movieId: number;
  title: string;
  releaseYear: number;
  posterUrl: string | null;              // null이면 폴백 그라데이션
  genres: string[];                      // 와이어프레임의 "SF, 드라마" → 배열로 정규화
  averageRating: number | null;          // 0~10 (외부 평점)
}

export interface MovieDetail extends MovieSummary {
  runtimeMinutes: number | null;
  synopsis: string | null;
  director: string | null;               // ★ 폴백 하드코딩 금지. null이면 "정보 없음" 렌더
  cast: string[];
  myRecord: WatchRecord | null;          // 내 기록 (미시청이면 null)
  isWishlisted: boolean;
}

// src/types/record.ts
export interface WatchRecord {
  recordId: number;
  movieId: number;
  watchedDate: string;                   // 'YYYY-MM-DD'
  rating: number;                        // 1~5 (사용자 별점, 외부 평점과 스케일 다름 주의)
  review: string | null;
  createdAt: string;                     // ISO8601
}

// src/types/collection.ts
export interface CollectionSummary {
  collectionId: number;
  title: string;
  movieCount: number;
  previewPosters: (string | null)[];     // 최대 5개, 카드 상단 스트립용
  isPublic: boolean;
}
export interface CollectionDetail extends CollectionSummary {
  description: string | null;
  movies: MovieSummary[];
  owner: UserSummary;
}

// src/types/user.ts
export interface UserSummary {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
}
export interface UserProfile extends UserSummary {
  bio: string | null;
  watchedCount: number;                  // 와이어프레임 "영화 135편 관람"
  followerCount: number;
  followingCount: number;
}

// src/types/social.ts
export type ActivityType = 'WATCH' | 'REVIEW' | 'COLLECTION';
export interface Activity {
  activityId: number;
  type: ActivityType;
  actor: UserSummary;
  createdAt: string;                     // ISO8601 → 화면에서 "2시간 전"으로 포맷
  movie: MovieSummary | null;            // WATCH, REVIEW
  rating: number | null;                 // REVIEW
  review: string | null;                 // REVIEW
  collection: CollectionSummary | null;  // COLLECTION
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

// src/types/theater.ts
export interface Theater {
  theaterId: number;
  name: string;
  brand: 'CGV' | 'MEGABOX' | 'LOTTE' | 'ETC';
  address: string;
  latitude: number;                      // 백엔드가 카카오 로컬 API로 조회해 공급
  longitude: number;
  distanceMeters: number | null;
}
export interface BoxOfficeMovie {
  rank: number;
  movieId: number;
  title: string;
  posterUrl: string | null;
}

// src/types/report.ts
export interface RatingBucket { rating: 1|2|3|4|5; count: number; }
export interface PersonCount { name: string; count: number; }

export interface StatisticsReport {        // 누적 (StatisticsScreen)
  totalMovies: number;
  totalWatchHours: number;
  averageRating: number;
  ratingDistribution: RatingBucket[];
  topDirectors: PersonCount[];             // 상위 3
  topActors: PersonCount[];                // 상위 3
}
export interface MonthlyReport {           // 월간 (MonthlyReportScreen)
  yearMonth: string;                       // 'YYYY-MM'
  totalMovies: number;
  totalWatchHours: number;
  averageRating: number;
  ratingDistribution: RatingBucket[];
  featuredDirector: PersonCount | null;
  summaryText: string;                     // 한 줄 요약 — ★백엔드 생성 권장(§6.9)
}

// src/types/calendar.ts
export interface CalendarEntry {
  date: string;                            // 'YYYY-MM-DD'
  movieId: number;
  title: string;
  posterUrl: string | null;
}
```

### 타입 관련 주의사항

1. **별점 스케일이 두 종류**입니다. `MovieSummary.averageRating`은 외부 평점 0~10(와이어프레임 `9.1`, `8.6`), `WatchRecord.rating`은 사용자 별점 1~5(별 5개 UI). 혼용 금지 — 컴포넌트 이름으로 구분하세요 (`ExternalRating` vs `RatingStars`).
2. `genres`는 배열로 정규화합니다. 와이어프레임의 `"SF, 드라마"` 문자열은 표시 시점에만 `.join(', ')` 합니다.
3. `director`는 **`null`일 때 "정보 없음"을 렌더**합니다. 와이어프레임처럼 `"크리스토퍼 놀란"`을 폴백으로 넣으면 안 됩니다.

---

## 4. API 계약 (`src/api/`)

### 4.1 공통 규약

- Base URL: `process.env.EXPO_PUBLIC_API_BASE_URL`
- 인증: `Authorization: Bearer <accessToken>`
- 페이지네이션 응답 봉투:
  ```ts
  interface Page<T> { content: T[]; page: number; size: number; totalElements: number; last: boolean; }
  ```
- 에러 응답 (백엔드 `@RestControllerAdvice`와 형식 합의 필요):
  ```ts
  interface ApiError { code: string; message: string; fieldErrors?: { field: string; reason: string }[]; }
  ```
- `client.ts` 인터셉터: 401 수신 시 refresh 1회 시도 → 실패하면 `authStore.logout()` 호출 후 `AuthStack`으로 자동 전환.

### 4.2 모듈별 엔드포인트

| 모듈 | 메서드 | 경로 | 용도 | 사용 화면 |
|---|---|---|---|---|
| **auth** | POST | `/api/auth/signup` | 회원가입 | SignUp |
| | POST | `/api/auth/login` | 로그인 → `{accessToken, refreshToken, user}` | Login |
| | POST | `/api/auth/reissue` | 토큰 재발급 | 인터셉터 |
| | GET | `/api/users/me` | 내 프로필 | MyPage |
| | PATCH | `/api/users/me` | 프로필 수정 | MyPage |
| **movie** | GET | `/api/movies/search?query=&page=` | 검색 | SearchResult |
| | GET | `/api/movies/{movieId}` | 상세(+내 기록 포함) | MovieDetail |
| | POST | `/api/movies/{movieId}/records` | 시청 기록 생성 | MovieDetail |
| | PATCH | `/api/records/{recordId}` | 기록 수정 | MovieDetail |
| | DELETE | `/api/records/{recordId}` | 기록 삭제 | MovieDetail |
| | GET | `/api/users/me/records?sort=&rating=&page=` | 시청 목록 | MyMovies |
| | GET | `/api/users/me/calendar?yearMonth=` | 캘린더 | Calendar, MyPage |
| **wishlist** | GET | `/api/users/me/wishlist?sort=&page=` | 찜 목록 | MyMovies |
| | POST | `/api/movies/{movieId}/wishlist` | 찜 추가 | MovieDetail |
| | DELETE | `/api/movies/{movieId}/wishlist` | 찜 해제 | MovieDetail |
| **collection** | GET | `/api/users/me/collections` | 내 컬렉션 목록 | CollectionList |
| | POST | `/api/collections` | 생성 | CollectionList |
| | GET | `/api/collections/{id}` | 상세 | CollectionDetail |
| | PATCH | `/api/collections/{id}` | 수정 | CollectionDetail |
| | DELETE | `/api/collections/{id}` | 삭제 | CollectionDetail |
| | POST | `/api/collections/{id}/movies` | 영화 추가 `{movieId}` | MovieDetail |
| | DELETE | `/api/collections/{id}/movies/{movieId}` | 영화 제거 | CollectionDetail |
| **social** | GET | `/api/feed?page=` | 활동 피드 | Social |
| | POST | `/api/activities/{id}/like` | 좋아요 | Social |
| | DELETE | `/api/activities/{id}/like` | 좋아요 취소 | Social |
| | GET | `/api/activities/{id}/comments` | 댓글 목록 | Social |
| | POST | `/api/activities/{id}/comments` | 댓글 작성 | Social |
| | POST | `/api/users/{id}/follow` | 팔로우 | MyPage |
| **recommend** | GET | `/api/recommendations?query=&keyword=&page=` | 추천 결과 | Recommendation |
| | GET | `/api/recommendations/keywords` | 키워드 목록 (하드코딩 제거) | Recommendation |
| **cinemap** | GET | `/api/boxoffice` | 박스오피스 Top N | CineMap |
| | GET | `/api/theaters?movieId=&lat=&lng=` | 상영 영화관 + 좌표 | CineMap |
| **report** | GET | `/api/users/me/statistics` | 누적 통계 | Statistics |
| | GET | `/api/users/me/reports/monthly?yearMonth=` | 월말 리포트 | MonthlyReport |

### 4.3 목/실제 전환

```ts
// src/api/index.ts
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
export const movieApi = USE_MOCK ? mockMovieApi : realMovieApi;
```

각 목 구현은 **실제 구현과 동일한 시그니처**를 갖고, `await delay(300)`으로 네트워크 지연을 흉내 냅니다. 이래야 로딩 상태 UI를 M2-B/C 단계에서 미리 검증할 수 있습니다. 목 데이터는 와이어프레임의 하드코딩 값(인터스텔라·기생충·어바웃 타임 등)을 `src/api/mock/fixtures.ts`로 옮겨 재사용합니다.

---

## 5. 네비게이션 설계

### 5.1 와이어프레임의 문제

와이어프레임은 모든 화면 전환을 부모의 불린 state로 처리합니다.

```tsx
// MyPageScreen.tsx — 현재 구조
if (showMyMovies)    return <MyMoviesScreen onBack={...} />;
if (showCollections) return <CollectionListScreen onBack={...} />;
if (showCalendar)    return <CalendarScreen onBack={...} />;
if (showStatistics)  return <StatisticsScreen onBack={...} />;
```

`MyPageScreen` 하나가 4개 화면의 렌더링 책임을 지고, 백스택·안드로이드 뒤로가기·딥링크·파라미터가 전부 없습니다. **이 구조를 스택으로 평탄화하는 것이 M2-A의 첫 작업**입니다.

### 5.2 목표 구조

```
RootNavigator (NativeStack, headerShown: false)
├── [!isAuthenticated] AuthNavigator (NativeStack)
│   ├── Login
│   └── SignUp
└── [isAuthenticated] MainTabNavigator (BottomTabs, 5탭)
    ├── HomeStack        Home → SearchResult → MovieDetail
    ├── RecommendStack   Recommendation → MovieDetail
    ├── CineMapStack     CineMap → TheaterDetail(선택)
    ├── SocialStack      Social → MovieDetail / CollectionDetail / UserProfile(선택)
    └── MyPageStack      MyPage → MyMovies → MovieDetail
                              → CollectionList → CollectionDetail → MovieDetail
                              → Calendar → MonthlyReport
                              → Statistics
                              → EditProfile
```

### 5.3 ParamList

```ts
// src/navigation/types.ts
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = { Login: undefined; SignUp: undefined; };

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
  MovieDetail: { movieId: number };          // ★ 객체가 아닌 ID만 전달
};

export type RecommendStackParamList = {
  Recommendation: undefined;
  MovieDetail: { movieId: number };
};

export type CineMapStackParamList = {
  CineMap: undefined;
  TheaterDetail: { theaterId: number };
};

export type SocialStackParamList = {
  Social: undefined;
  MovieDetail: { movieId: number };
  CollectionDetail: { collectionId: number };
};

export type MyPageStackParamList = {
  MyPage: undefined;
  EditProfile: undefined;
  MyMovies: { initialTab?: 'watched' | 'wishlist' };
  CollectionList: undefined;
  CollectionDetail: { collectionId: number };
  Calendar: undefined;
  MonthlyReport: { yearMonth: string };      // 어느 달 리포트인지 명시
  Statistics: undefined;
  MovieDetail: { movieId: number };
};
```

> `MovieDetail`이 4개 스택에 중복 등록됩니다. 이는 React Navigation의 정석 패턴입니다 — 각 탭이 독립 히스토리를 갖고, 상세에서 뒤로 가면 원래 탭의 이전 화면으로 돌아갑니다. 화면 컴포넌트 자체는 하나만 만들어 재사용하세요.

### 5.4 탭 정의

와이어프레임 `BottomNavigation.tsx` 그대로 유지합니다.

| key | label | icon (lucide) |
|---|---|---|
| `HomeTab` | 홈 | `Home` |
| `RecommendTab` | 추천 | `Film` |
| `CineMapTab` | CineMap | `Map` |
| `SocialTab` | 소셜 | `Users` |
| `MyPageTab` | 마이페이지 | `User` |

- 활성 `tintColor`: `colors.primary`, 비활성: `colors.mutedForeground`
- 탭바 높이 64 + `useSafeAreaInsets().bottom`
- **와이어프레임의 `pb-20`은 전부 제거**합니다. 웹에서는 `fixed` 탭바를 피하려고 각 화면이 하단 패딩을 직접 넣었지만, RN에서는 탭 네비게이터가 자동으로 콘텐츠 영역을 계산합니다. 그대로 옮기면 하단에 80px 빈 공간이 생깁니다.

### 5.5 헤더 전략

와이어프레임은 각 화면이 `ArrowLeft` 버튼 + 제목을 직접 그립니다. RN에서는 두 가지 선택지가 있는데, **네이티브 헤더를 사용**하세요.

```tsx
<Stack.Screen name="MyMovies" component={MyMoviesScreen}
  options={{ headerShown: true, title: '내 영화' }} />
```

- 안드로이드 하드웨어 뒤로가기, iOS 스와이프 백 제스처가 공짜로 따라옵니다
- 예외 2개: `MovieDetail`(포스터 위 투명 헤더 → `headerTransparent: true`), `Home`(헤더 없음 → `headerShown: false`)
- `MyMovies`의 스크롤 시 헤더 숨김 효과는 §7의 별도 처리 참조

---

## 6. 화면별 이식 스펙

### 6.0 전 화면 공통 규칙

1. **`div` → `View`, `h1~h4`/`p`/`span` → `Txt`(프리미티브), `button` → `Pressable`**
2. **엔티티가 아니라 ID를 넘깁니다.** 와이어프레임은 `<MovieDetailScreen movie={selectedMovie} />`처럼 객체를 통째로 넘기며, `CollectionDetailScreen`은 없는 필드를 `genre: '드라마', rating: 8.5, year: 2020`으로 지어냈습니다. RN에서는 `navigate('MovieDetail', { movieId })` 후 화면이 `useMovieDetail(movieId)`로 직접 조회합니다.
3. **모든 목록 화면은 3-상태를 처리합니다**: 로딩(`LoadingState`, 스켈레톤) / 에러(`ErrorState`, 재시도 버튼) / 빈 목록(`EmptyState`, 안내 문구 + CTA). 와이어프레임에는 셋 다 없습니다.
4. `ScrollView` + `.map()` 대신 **`FlatList`**를 씁니다 (`MyMovies` 18~수백 개, `Social` 피드, `SearchResult`).
5. 리스트 `key`는 `movieId` 등 안정적인 도메인 ID를 씁니다. 와이어프레임의 `key={`${collection.id}-${movie.id}-${index}`}` 같은 조합키는 불필요해집니다.

---

### 6.1 Login / SignUp — ★신규 (와이어프레임에 없음)

와이어프레임에 인증 화면이 전혀 없어 새로 설계합니다. 홈 화면의 브랜딩(시안 `#14D9D9`, 텍스트 아웃라인 로고)을 그대로 재사용해 톤을 맞춥니다.

**Login**
- 로고(`CineMory`, `HomeScreen`의 타이포 스타일 재사용) / 이메일 / 비밀번호 / `로그인` 버튼 / `회원가입` 텍스트 링크
- 유효성: 이메일 형식, 비밀번호 8자 이상. `react-hook-form` + `zod` 권장
- 성공 시 `authStore.setAuth({ accessToken, refreshToken, user })` → `RootNavigator`가 `MainTab`으로 자동 전환 (수동 `navigate` 금지)
- 토큰은 `expo-secure-store`에 저장. **`AsyncStorage`에 리프레시 토큰 저장 금지**

**SignUp**
- 이메일 / 비밀번호 / 비밀번호 확인 / 닉네임 / `가입하기`
- 닉네임 중복 검사는 blur 시점에 디바운스 호출
- 서버 필드 에러(`ApiError.fieldErrors`)를 해당 입력 아래에 매핑해 표시

**부팅 시퀀스** — `RootNavigator` 마운트 시 SecureStore의 토큰을 확인하는 동안 `SplashScreen`을 유지해야 합니다. 이걸 빠뜨리면 앱 실행 시 로그인 화면이 한 번 깜빡였다가 메인으로 넘어갑니다.

---

### 6.2 HomeScreen

- 배경: 4열 포스터 그리드가 60초 주기로 위로 흐르는 애니메이션. `react-native-reanimated`의 `withRepeat(withTiming(-height, {duration: 60000, easing: Easing.linear}), -1)`로 구현. 성능 이슈 시 M2에서는 정적 그리드로 대체 가능(우선순위 낮음).
- 로고: `fontSize: 56, fontWeight: '700', color: '#14D9D9'`. 와이어프레임의 4방향 `textShadow` 아웃라인은 RN이 단일 그림자만 지원하므로, **동일 텍스트를 4번 오프셋 렌더링해 겹치거나** 그냥 단일 `textShadow`로 단순화합니다.
- 검색: `TextInput` + `returnKeyType="search"` + `onSubmitEditing` → `navigate('SearchResult', { query })`
- 와이어프레임의 `showSearchResult` 불린 state는 제거합니다.
- 헤더 없음(`headerShown: false`), 탭바만 노출

### 6.3 SearchResultScreen

- 헤더: 네이티브 헤더 `title: '검색 결과'`, 하위에 `'{query}' 검색 결과 N개` 서브텍스트
- `FlatList` + `MovieListItem` (포스터 80×112, 제목/장르/연도/외부평점)
- `useMovieSearch(query)` — react-query `useInfiniteQuery`, `onEndReached`로 다음 페이지
- 항목 탭 → `navigate('MovieDetail', { movieId })`
- 빈 결과: `EmptyState` "검색 결과가 없습니다"

### 6.4 MovieDetailScreen ★ M2의 핵심 화면

와이어프레임에서 가장 많은 상호작용을 담고 있고, 실제로는 **읽기 영역과 쓰기 영역이 섞여** 있습니다.

**레이아웃**
1. 히어로: 높이 256, 포스터 색 그라데이션 배경 + 하단 배경색으로 페이드. `headerTransparent: true`, 뒤로가기 버튼은 반투명 원형
2. 포스터 카드(112×160) + 제목 + `{연도} · {상영시간}` — 흰 텍스트 + 그림자
3. 정보 카드: 외부 평점 / 장르 / 감독 / 출연
4. 줄거리 카드
5. **내 기록 카드** (아래)
6. `저장하기` 버튼

**내 기록 카드 — 상태 머신으로 설계하세요**

와이어프레임은 `isWatched`, `watchDate`, `userRating`, `isInCollection` 4개의 로컬 state를 두고 `저장하기` 버튼에 핸들러가 없습니다. 실제로는 세 가지 독립적인 액션입니다.

| 액션 | 저장 시점 | API |
|---|---|---|
| **찜하기** (`Heart`) | **즉시** (낙관적 업데이트) | `POST/DELETE /movies/{id}/wishlist` |
| **컬렉션에 추가** | 즉시 (컬렉션 선택 시트 → 선택) | `POST /collections/{id}/movies` |
| **시청 기록** (날짜+별점+리뷰) | **`저장하기` 버튼** | `POST /movies/{id}/records` 또는 `PATCH /records/{id}` |

- `myRecord`가 이미 있으면 폼을 그 값으로 초기화하고 버튼은 `수정하기`, 하단에 `기록 삭제` 추가
- 시청 날짜: `<input type="date">` → `@react-native-community/datetimepicker` (Android는 imperative `DateTimePickerAndroid.open()`, iOS는 인라인/모달 — 플랫폼 분기 필요)
- 별점: 별 5개 `Pressable`. **같은 별을 다시 누르면 해제**되게 하세요 (와이어프레임엔 0점으로 되돌릴 방법이 없습니다)
- 리뷰 입력(`TextInput multiline`) 추가 — 소셜 피드에 리뷰가 뜨는데 와이어프레임엔 작성 UI가 없습니다
- 컬렉션 추가는 단순 토글이 아니라 **어느 컬렉션인지 고르는 시트**여야 합니다 (와이어프레임은 불린 토글)
- 저장 성공 시 `queryClient.invalidateQueries`로 `calendar`, `myRecords`, `statistics` 무효화

### 6.5 MyMoviesScreen

- 상단 세그먼트: `시청 목록` / `찜 목록` (`initialTab` 파라미터로 진입 시 지정 가능)
- 정렬 드롭다운: 최근 담은 순 / 오래된 순 / 별점 높은 순 / 별점 낮은 순
- 별점 필터(시청 탭에서만): 전체 / ★5 ~ ★1
- 그리드(3열) ↔ 리스트 토글

> ⚠️ **와이어프레임에서 `sortOption`과 `ratingFilter` state는 선언만 되고 실제 목록에 전혀 반영되지 않습니다.** M2에서는 두 값을 **쿼리 파라미터로 서버에 전달**하세요 (`GET /users/me/records?sort=RATING_DESC&rating=5`). 클라이언트 정렬은 페이지네이션과 충돌합니다.

- 드롭다운은 `absolute` 대신 하단 `ActionSheet`(Modal)로 구현 — 모바일 관용 패턴이고 화면 밖 잘림 문제가 없습니다
- 스크롤 시 헤더 숨김: 와이어프레임은 DOM `scrollTop` 델타 + `offsetHeight` 측정으로 구현했습니다. RN에서는 `Animated.FlatList` + `useAnimatedScrollHandler`로 대체하되, **M2에서는 우선순위를 낮추고 고정 헤더로 시작**해도 무방합니다. 필터 바를 `FlatList`의 `ListHeaderComponent`로 넣으면 자연스럽게 함께 스크롤됩니다.

### 6.6 CollectionList / CollectionDetail

**CollectionList**
- 카드 = 상단 포스터 스트립(최대 5, 부족분은 빈 슬롯) + 하단 제목/편수. 와이어프레임 구조 유지
- `컬렉션 생성` → Modal 폼 (제목, 설명, 공개 여부)

**CollectionDetail**
- 그리드/리스트 토글 + `MoreVertical` 메뉴(수정/삭제) → `ActionSheet`
- 삭제는 `Alert.alert` 확인 다이얼로그 필수
- ⚠️ 와이어프레임은 `movieCount`가 5보다 크면 `영화 6, 영화 7...`을 `Math.random()` 별점과 함께 **지어냅니다**. 실제로는 `GET /collections/{id}`가 전체 영화를 반환하므로 그 코드는 전부 제거합니다.

### 6.7 Calendar / MonthlyReport

**CalendarView** (공용 컴포넌트, `compact` prop 유지)
- `compact={true}`: MyPage 요약용, 관람일에 4px 점
- `compact={false}`: Calendar 상세용, 관람일에 32×40 포스터 썸네일
- 월 이동 시 `useCalendar(yearMonth)` 재조회. 와이어프레임의 `useCalendarData`는 하드코딩 목이므로 react-query 훅으로 교체
- **초기 월을 `new Date(2026, 4, 1)`로 하드코딩한 부분을 오늘 날짜로 바꾸세요**
- 날짜 탭 → 해당 `movieId`의 `MovieDetail`로 이동 (와이어프레임엔 탭 동작 없음)

**MonthlyReport**
- 파이 차트(평점 분포) → `react-native-gifted-charts`의 `PieChart`
- `이번 달의 주목` 카드, `한 줄 요약` 카드
- ⚠️ 요약 문구를 클라이언트에서 템플릿 조립하지 말고 **백엔드 `summaryText`로 받으세요**. 데이터가 없는 달(0편)에 "총 0편의 영화를 관람하며" 같은 문장이 나가는 걸 막을 수 있고, 나중에 문구를 바꿀 때 앱 배포가 필요 없습니다.
- 빈 달 처리: 기록 0건이면 `EmptyState`

### 6.8 StatisticsScreen

- 상단 스탯 2칸: 누적 관람 편수 / 총 시청시간
- 별점 분포 막대 차트 → `BarChart` (막대색 `colors.primary`, 상단 radius 8)
- 선호 감독 / 선호 배우 Top 3 — 1·2·3위 금·은·동 뱃지(`#FFD700`, `#C0C0C0`, `#CD7F32`)
- 데이터 부족 시(기록 0건) 차트 대신 `EmptyState`

### 6.9 RecommendationScreen

- 검색 입력 + 키워드 드롭다운(`#액션`, `#드라마`, `#로맨스`)
- ⚠️ 와이어프레임은 검색어·키워드가 결과에 **전혀 반영되지 않습니다**. `useRecommendations({ query, keyword })`로 서버 파라미터화하세요.
- 키워드 목록도 하드코딩 대신 `GET /recommendations/keywords`로 받습니다
- 결과 항목 → `MovieDetail`로 이동 (와이어프레임엔 탭 동작 없음)

### 6.10 SocialScreen

- `FlatList` 피드, 3종 카드 타입(`WATCH` / `REVIEW` / `COLLECTION`) — `renderActivity` 스위치 구조 유지
- 와이어프레임의 `ml-13`(= 52px)은 아바타 40 + gap 12 만큼 본문을 아바타 오른쪽에 정렬하려는 의도입니다. Tailwind v4의 동적 spacing 스케일이라 웹에서는 유효하지만, 모바일 폭(360~430)에서는 52px을 빼면 리뷰 본문이 지나치게 좁아집니다. **RN에서는 들여쓰기를 제거하고 카드 전체 폭을 쓰는 편을 권장**합니다.
- 좋아요/댓글 버튼에 실제 핸들러 연결 (좋아요는 낙관적 업데이트, `likedByMe` 반영)
- `timestamp`: 서버는 ISO8601을 주고 앱이 `date-fns`의 `formatDistanceToNow({ locale: ko })`로 "2시간 전" 렌더
- 카드 탭 → 대상에 따라 `MovieDetail` 또는 `CollectionDetail`

### 6.11 CineMapScreen (TheaterMapScreen)

- 상단: 박스오피스 Top 5 가로 스크롤 칩. 선택 시 해당 영화 상영관으로 필터
- 중단(높이 50%): **`WebView` + Kakao Maps JS SDK**
- 하단(높이 50%): 가까운 영화관 리스트, 번호 뱃지가 지도 마커 번호와 일치

**WebView 연동 스펙**

```
RN → WebView : webViewRef.current.injectJavaScript(`window.setMarkers(${JSON.stringify(theaters)}); true;`)
WebView → RN : window.ReactNativeWebView.postMessage(JSON.stringify({ type:'MARKER_CLICK', theaterId }))
               → <WebView onMessage={...} />
```

**필수 주의사항**
1. 카카오 JS 키는 개발자 콘솔 `플랫폼 > Web > 사이트 도메인`에 등록된 origin에서만 동작합니다. `source={{ html }}`만 쓰면 origin이 `null`이라 **지도가 렌더링되지 않습니다.** 반드시 `source={{ html, baseUrl: 'https://<등록한 도메인>' }}` 형태로 `baseUrl`을 지정하세요.
2. 지도 HTML은 `assets/kakaoMap.html`로 분리하고 `expo-asset`으로 로드합니다. TS 문자열에 인라인하면 유지보수가 어렵습니다.
3. **카카오 로컬 API를 앱에서 직접 호출하지 마세요.** REST 키가 번들에 노출됩니다. 백엔드가 KOBIS 상영정보 + 카카오 로컬 좌표를 조인해 `Theater[]`로 내려주고, 앱은 좌표를 마커로 그리기만 합니다.
4. 위치 권한: `expo-location`. 거부 시 서울시청 좌표로 폴백하고 거리 표시를 숨깁니다.
5. WebView 로딩 중 스피너 오버레이 필요 (초기 렌더가 눈에 띄게 늦습니다).

### 6.12 MyPageScreen

- 커버(높이 128, primary 그라데이션) + 프로필 이미지(96, 겹침) + 닉네임 + `영화 N편 관람`
- ⚠️ 와이어프레임의 `<h2>User</h2>`와 `영화 135편 관람`은 하드코딩입니다 → `useMyProfile()`로 대체
- `프로필 수정` → `EditProfile` 화면, `UserPlus` 버튼 → 팔로우/친구 찾기 (M2에서 목적 확정 필요)
- 2열 카드: `내 영화`, `내 컬렉션`
- 캘린더 요약 카드(`compact`) + `캘린더 상세` 링크
- `시청 분석` 행 → `Statistics`
- **`로그아웃` 항목 추가** (와이어프레임에 없음) — `authStore.logout()` + SecureStore 클리어

---

## 7. 웹 → RN 변환 규칙표

| 와이어프레임 | RN 대응 | 비고 |
|---|---|---|
| `hover:*` | 제거 | 터치 환경에 없음. `Pressable`의 `pressed` 상태로 대체 |
| `transition-*`, `duration-*` | `Animated` / `LayoutAnimation` | CSS 트랜지션 없음 |
| `fixed`, `sticky` | 네비게이터가 처리 | 탭바·헤더는 네비게이션 계층으로 이동 |
| `pb-20` (하단 여백) | **삭제** | 탭 네비게이터가 자동 계산 |
| `shadow-lg`, `shadow-md` | iOS `shadow*` / Android `elevation` | 플랫폼 분기 필요 |
| `blur-[2px]`, `backdrop-blur-sm` | `expo-blur` 또는 opacity로 단순화 | 홈 배경, 검색 입력 |
| `line-clamp-2` | `<Text numberOfLines={2}>` | |
| `aspect-[2/3]` | `style={{ aspectRatio: 2/3 }}` | RN 지원됨 |
| `overflow-x-auto` | `<ScrollView horizontal>` | 박스오피스 칩, 탭 |
| `overflow-y-auto` | `ScrollView` / `FlatList` | |
| `linear-gradient(...)` | `expo-linear-gradient` | 포스터 폴백, 히어로, 커버 |
| `<input type="date">` | `@react-native-community/datetimepicker` | |
| `<input type="text">` | `<TextInput>` | |
| `absolute` 드롭다운 | `Modal` 기반 `ActionSheet` | 정렬/별점/컬렉션 메뉴 |
| `recharts` `BarChart`/`PieChart` | `react-native-gifted-charts` | |
| `lucide-react` | `lucide-react-native` | 아이콘명 동일 |
| `title="..."` 툴팁 | 제거 또는 롱프레스 | `CalendarView` 포스터 |
| `@keyframes` CSS 애니메이션 | `react-native-reanimated` | 홈 배경 슬라이드 |
| `Math.random()` 목 데이터 | **전부 제거** | `CollectionDetail`의 가짜 별점 |

### 설치 대상 패키지

```bash
npx expo install react-native-webview expo-linear-gradient expo-secure-store \
  expo-location expo-asset expo-blur react-native-svg \
  @react-native-community/datetimepicker react-native-reanimated
npm i @tanstack/react-query axios zustand date-fns \
  lucide-react-native react-native-gifted-charts react-hook-form zod @hookform/resolvers
# 스타일링 (택1) — 설치 후 빌드 통과 여부를 먼저 확인
npm i nativewind && npm i -D tailwindcss
```

> ⚠️ Expo SDK 56 / RN 0.85는 최신 버전입니다. 각 패키지를 **`npx expo install`로 설치해 SDK 호환 버전이 선택되도록** 하고, `npx expo-doctor`로 검증하세요. `AGENTS.md`의 지침대로 https://docs.expo.dev/versions/v56.0.0/ 를 확인한 뒤 코드를 작성합니다.

---

## 8. 실행 순서 (Claude Code 작업 단위)

### M2-A 기반
1. 패키지 설치 + `expo-doctor` 통과 확인 + 스타일링 라이브러리 동작 검증
2. `src/theme/tokens.ts`, `src/components/primitives/` 작성
3. `src/types/**` 도메인 타입 전체 작성
4. `src/api/client.ts`, `endpoints.ts`, 각 모듈 시그니처 + `mock/fixtures.ts` + 목 구현
5. `src/hooks/**` react-query 래퍼
6. `src/store/authStore.ts` (zustand + SecureStore)
7. `src/navigation/**` 전체 골격 — 각 화면은 빈 플레이스홀더로 두고 **네비게이션이 먼저 끝까지 돌아가는지 확인**

### M2-B 핵심 라인
8. `Login`, `SignUp` + 부팅 시퀀스(SplashScreen 유지)
9. `Home` → `SearchResult` → `MovieDetail`
10. `MovieDetail`의 기록 저장/수정/삭제, 찜, 컬렉션 추가
11. `MyPage` → `MyMovies` (정렬·필터 서버 파라미터화)
12. `CalendarView` 공용 컴포넌트 → `Calendar`

### M2-C 나머지 화면
13. `CollectionList` → `CollectionDetail` (+ 생성/수정/삭제)
14. `Statistics`, `MonthlyReport` (차트)
15. `Recommendation`
16. `Social` (피드, 좋아요/댓글)
17. `CineMap` (WebView + Kakao) — **가장 불확실성이 크므로 마지막에 두되, JS 키 도메인 등록은 미리 해두세요**

### M2-D 연동
18. `USE_MOCK=false` 전환, 실제 엔드포인트 대응
19. 로딩/에러/빈 상태 전 화면 점검
20. 토큰 만료·재발급·강제 로그아웃 시나리오 검증

---

## 9. 백엔드와 합의가 필요한 항목

M2-D 진입 전에 확정해야 합니다.

1. **에러 응답 포맷** — `{ code, message, fieldErrors }` 구조 합의 (`@RestControllerAdvice`)
2. **페이지네이션 포맷** — Spring `Page` 기본 직렬화를 쓸지, `Page<T>` 커스텀 봉투를 쓸지
3. **인증 방식** — JWT Access/Refresh 만료 시간, refresh 회전 여부
4. **별점 스케일** — 사용자 별점 1~5 정수 확정 (0.5 단위 허용 여부)
5. **`MovieDetail` 응답에 `myRecord` 포함 여부** — 포함하면 요청 1회로 끝나고, 분리하면 캐시 무효화가 단순해집니다. **포함 권장**
6. **포스터 이미지 출처** — TMDB / KMDb / 자체 저장. `posterUrl`이 절대 URL인지 상대 경로인지
7. **`summaryText`(월말 리포트 한 줄 요약) 생성 주체** — 백엔드 권장
8. **영화관 좌표 공급** — 백엔드가 카카오 로컬 API를 호출해 좌표까지 내려주는 것으로 합의
9. **소셜 피드 범위** — 전체 공개 피드인지 팔로잉 기반인지 (와이어프레임만으론 판단 불가)

---

## 10. 부록 — 지도 구현 전환 대비 설계

### 10.1 배경

M2는 WebView 방식(a안)으로 시작합니다. 다만 조작감 문제로 네이티브 SDK(b안)로 전환할 가능성이 있으므로, **전환 비용을 코드 1~2파일로 묶어두는 것**을 M2-C 착수 조건으로 둡니다.

### 10.2 WebView 방식의 실제 성능 특성

| 구간 | 체감 | 대응 |
|---|---|---|
| 초기 로딩 (0.5~1.5s) | **큼** | ① 탭 전환 시 WebView 언마운트 금지 (`MainTab`의 `unmountOnBlur: false`) ② 카카오 SDK를 로컬 asset으로 번들 ③ 로딩 오버레이 |
| 팬/줌 제스처 | 작음 | WebView 내부에서 완결되어 RN 브리지를 거치지 않음. 저사양 Android에서만 차이 |
| **제스처 충돌** | **큼** | 지도(상단 50%) ↔ 리스트(하단 50%) 경계에서 스크롤이 샘. 지도 컨테이너에 명시적 터치 responder 설정, Android는 `nestedScrollEnabled` 확인 |
| 마커 탭 반응 | 없음 | `postMessage` 왕복 16~50ms |

### 10.3 격리 인터페이스 (필수)

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

### 10.4 전환 비용 정리

| 항목 | 비용 | 되돌리기 |
|---|---|---|
| 코드 (인터페이스 격리 시) | 반나절~1일 | 쉬움 |
| **`expo prebuild` → Dev Client 전환** | **높음** — Expo Go 사용 불가, 팀 전원 dev client 재빌드, EAS 빌드 쿼터 또는 로컬 빌드 환경(iOS는 맥) | **사실상 편도** |
| 카카오 네이티브 앱 키 발급·플랫폼 등록 | 낮음 | — |

### 10.5 b안 후보 비교

| | 카카오 네이티브 (`@react-native-kakao/map` 등) | `react-native-maps` |
|---|---|---|
| 한국 지도 품질 | 최상 | 구글 지도는 국내 데이터 반출 규제로 상세도 낮음. iOS `PROVIDER_DEFAULT`(Apple Maps)는 상대적으로 나음 |
| 생태계 | 커뮤니티 래퍼 (비공식). 착수 전 다운로드 수·최근 커밋·이슈 확인 필요 | 표준, 문서 풍부 |
| Expo SDK 56 | 확인 필요 | ⚠️ config plugin이 SDK 56에서 깨짐 (`@expo/config-plugins` 경로 문제, 미해결). 워크어라운드: `npx expo install @expo/config-plugins` |

> 좌표를 백엔드가 공급하므로 앱의 지도는 "아는 좌표에 마커 찍기"만 합니다. 카카오의 POI 검색 정확도는 이미 백엔드에서 확보된 상태라, 렌더링 레이어 선택은 **지도 배경 품질**과 **Expo 호환성**만 보고 판단하면 됩니다.

### 10.6 판단 시점

- **결정 시점**: M2-C에서 a안을 실기기로 만져본 뒤. 추측으로 prebuild를 결정하지 않습니다.
- **전환 적기**: M3 초입 — M2 화면이 모두 끝나 회귀 테스트 범위가 명확해진 시점.
- **중요**: prebuild 결정을 지도 하나로 내리지 마세요. 카카오 로그인·푸시 알림 등 다른 네이티브 요구가 생기면 어차피 필요하므로, **묶어서 한 번에 전환하는 것이 총비용이 낮습니다.**
