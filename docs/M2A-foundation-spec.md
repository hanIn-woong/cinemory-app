# CineMory M2-A — 기반 구축 구현 스펙

> 상위 문서: `docs/M2-frontend-spec.md` (§12 실행 순서의 상세판)
> 대상: `cinemory-app` — Expo SDK 56 / RN 0.85 / React 19.2 / TypeScript
> 이 문서는 **Claude Code가 그대로 구현할 수 있는 수준의 파일 단위 스펙**이다.

**M2-A 완료 판정** — 앱을 켰을 때
① 스플래시가 유지되다가 ② 토큰 유무에 따라 로그인/메인으로 **깜빡임 없이** 진입하고
③ 탭 5개와 모든 하위 화면(플레이스홀더)로 이동·복귀가 되면 끝이다.
**화면 내용은 M2-A의 범위가 아니다.**

---

## 0. 패키지 호환성 사전 확인 결과 (2026-08-28 npm 레지스트리 실측)

### 0.1 Expo 56이 버전을 관리하는 것 — `npx expo install`로 설치

전부 `expo/bundledNativeModules.json`에 있으므로 **버전을 직접 적지 않는다.**

| 패키지 | Expo 56 지정 |
|---|---|
| `expo-secure-store` | `~56.0.4` |
| `expo-splash-screen` | `~56.0.10` |
| `expo-linear-gradient` | `~56.0.4` |
| `expo-blur` | `~56.0.3` |
| `expo-asset` | `~56.0.17` |
| `expo-location` | `~56.0.18` |
| `react-native-reanimated` | `4.3.1` |
| `react-native-svg` | `15.15.4` |
| `react-native-webview` | `13.16.1` |
| `@react-native-community/datetimepicker` | `9.1.0` |
| `react-native-screens` / `safe-area-context` | 설치 완료 |

✅ `lucide-react-native`의 `react-native-svg` peer는 `^15`이고 Expo 56이 `15.15.4`를 지정하므로 **충돌 없음.**

### 0.2 스타일링 — 실측으로 갈렸다

| | `nativewind@4.2.6` | `uniwind@1.11.0` |
|---|---|---|
| `peerDependencies` | **`{ tailwindcss: '>3.3.0' }` 뿐** | `react >=19.0.0`, **`react-native >=0.81.0`**, `tailwindcss >=4`, metro 계열 |
| RN 0.85 지원 선언 | ❌ **아무 선언이 없다**(침묵) | ✅ **명시적으로 포함** |
| React 19.2 지원 선언 | ❌ 없음 | ✅ 포함 |
| Tailwind 세대 | **v3 기반** (v5가 v4 대응이나 `preview` 단계) | **v4 전용** |
| dist-tags | `latest 4.2.6` / `preview 5.0.0-preview.4` | `latest 1.11.0` |
| 런타임 의존 | `react-native-css-interop` (JS) | 빌드타임 Node 네이티브(`@tailwindcss/oxide`, `lightningcss`) |

> ⚠️ **NativeWind v4를 쓴다면 `tailwindcss`를 v3로 핀해야 한다.**
> peer 범위가 `>3.3.0`이라 최신 `tailwindcss@4.3.3`도 형식상 통과하지만, NativeWind v4는
> **Tailwind 3의 `tailwind.config.js` 방식**을 전제로 만들어졌다. Tailwind 4는 CSS-first
> `@theme` 방식이라 조합이 어긋난다. **`npm i -D tailwindcss@^3.4`로 명시 설치할 것.**
> 그냥 `npm i -D tailwindcss`를 치면 4.x가 들어와 원인 불명으로 스타일이 안 먹는다.

> 💡 **와이어프레임은 Tailwind v4다**(`theme.css`가 `@custom-variant` 사용).
> NativeWind v4를 택하면 `theme.css`의 CSS 변수를 `tailwind.config.js`로 옮기는 일회성 변환이
> 붙는다(1시간 내외). Uniwind를 택하면 그 변환이 없다.

**결정 절차는 §1을 그대로 따른다. 지금 고르지 말고 실측으로 정한다.**

---

## 1. 3단계 — 스타일링 실빌드 검증

> **판정 기준을 먼저 정하고 시작한다.** "되는 것 같다"로 넘어가면 화면 10개를 만든 뒤에
> 갈아엎게 된다.

### 1-A. NativeWind 먼저 시도

```bash
npm i nativewind
npm i -D tailwindcss@^3.4        # ★ v4가 들어오지 않게 반드시 버전 지정
npx tailwindcss init
```

설정 3곳:
1. `tailwind.config.js` — `content: ["./App.tsx", "./src/**/*.{ts,tsx}"]`, `presets: [require("nativewind/preset")]`
2. `babel.config.js` — `presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"]`
3. `metro.config.js` — `withNativeWind(config, { input: "./global.css" })`
4. `global.css` — `@tailwind base; @tailwind components; @tailwind utilities;`
5. `nativewind-env.d.ts` — `/// <reference types="nativewind/types" />`

### 1-B. 판정 — 아래 4개가 **전부** 통과해야 채택

| # | 검증 | 실패 시 의미 |
|---|---|---|
| 1 | `npx expo-doctor` 통과 | 의존성 트리 문제 |
| 2 | `npx expo start`가 번들 에러 없이 뜬다 | Babel/Metro 배선 실패 |
| 3 | **실기기(Expo Go)에서 `<View className="bg-red-500 p-4">`가 실제로 붉게 렌더** | ⚠️ **여기서 가장 많이 조용히 실패한다.** 번들은 되는데 스타일만 안 먹는다 |
| 4 | 커스텀 토큰(`bg-primary`)이 적용된다 | `tailwind.config.js` 연결 실패 |

**3번이 핵심이다.** className이 무시돼도 앱은 정상 실행되므로, 육안 확인 없이는 통과로 착각한다.

### 1-C. 실패하면 Uniwind로 전환

```bash
npm uninstall nativewind tailwindcss
npm i uniwind
npm i -D tailwindcss@^4
```

Uniwind는 **Babel 프리셋이 필요 없고 Metro 플러그인만** 쓴다. Tailwind v4 CSS-first이므로
와이어프레임 `theme.css`의 `@theme` 블록을 거의 그대로 옮길 수 있다.
판정 기준(1-B)은 동일하게 적용한다.

### 1-D. 둘 다 실패하면

`StyleSheet` + `theme/tokens.ts`로 간다. §2의 토큰과 §3의 프리미티브가 **이미 그 전제로 설계돼
있으므로 화면 코드에 미치는 영향은 프리미티브 내부로 한정된다.** M2-A를 멈추지 말 것.

### ✅ 채택 결과 (2026-08-28)

**NativeWind v4.2.6 + `tailwindcss@^3.4.19` 채택.** 1-B 판정 4개 중 1·2·4는 통과했고,
번들에 토큰 값이 실제로 컴파일되는 것까지 확인했다. **3번(실기기 육안 확인)은 미완**이므로
첫 실기기 구동 시 반드시 본다.

구현 중 드러난 부수 사항 2건:
- **NativeWind v4는 애니메이션을 쓰지 않아도 `react-native-worklets`를 요구한다** → 명시 설치
- `openapi-typescript@7`의 `typescript@^5` peer가 이 프로젝트의 `typescript@~6`과 충돌 →
  `.npmrc`의 `legacy-peer-deps=true`로 해소 (§11의 주의 참고)

> **결론을 아래 변경 이력에 기록한다** — 어떤 라이브러리를,
> 어떤 근거로 채택했는지. 나중에 "왜 이걸 쓰지?"가 반드시 나온다.

---

## 2. `src/theme/tokens.ts` · `src/constants/tmdb.ts`

상위 스펙 §7.1 / §7.2를 그대로 구현한다. 두 파일 모두 **런타임 의존성이 없는 순수 상수**여야
한다(스타일링 라이브러리를 import하지 않는다). 그래야 §1-D 전환 시 살아남는다.

**`tokens.ts` 추가 규칙**
- 모든 export는 `as const`
- 색상은 hex 문자열. `oklch()`를 쓰지 않는다(RN 미지원)
- NativeWind/Uniwind를 쓰더라도 **토큰의 원본은 이 파일**이고, Tailwind 설정이 이 파일을
  import해서 확장한다. 두 곳에 값을 적으면 반드시 어긋난다.

⚠️ **`colors`를 통째로 넘기지 말고 중첩 매핑한다.** 토큰 키가 `primaryForeground`처럼
camelCase라 그대로 넘기면 Tailwind가 **`text-primaryForeground`만** 만들고
**`text-primary-foreground`는 만들지 않는다.** 와이어프레임 2,387줄이 전부 kebab-case
(`text-muted-foreground` · `bg-primary-foreground` · `bg-card`)를 쓰므로, 그대로 두면
M2-B에서 **클래스명을 전부 바꿔야 하고 NativeWind를 택한 이유가 사라진다.**

```js
// tailwind.config.js — 값을 다시 적지 않되, 키는 kebab 구조로 편다
const { colors: c, radius } = require('./src/theme/tokens');

module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {
    colors: {
      background: c.background, foreground: c.foreground, card: c.card,
      border: c.border, accent: c.accent, destructive: c.destructive, star: c.star,
      primary: { DEFAULT: c.primary, foreground: c.primaryForeground },
      muted:   { DEFAULT: c.muted,   foreground: c.mutedForeground },
      input:   { background: c.inputBackground },
      brand:   { deep: c.brandDeep,  light: c.brandLight },
    },
    borderRadius: radius,
  }},
};
```

이러면 `bg-primary` · `text-primary-foreground` · `text-muted-foreground` · `bg-card`가
모두 생성된다. **프리미티브의 클래스 문자열도 kebab으로 맞춘다.**

> ✅ `borderRadius`에 숫자(`{ md: 10 }`)를 넣어도 **Tailwind가 `10px`로 단위를 붙인다**
> (2026-08-28 실컴파일 확인). 문자열로 바꿀 필요 없다.

⚠️ **`typography`를 tokens.ts와 프리미티브 양쪽에 두지 않는다.** 둘 중 하나가 단일 출처다.
- (A) `tailwind.config.js`의 `fontSize`를 `tokens.typography`에서 생성하고 프리미티브는 그 클래스를 쓴다
- (B) `tokens.typography`를 **삭제**하고 `Txt.tsx`의 variant 클래스를 단일 출처로 선언한다

어느 쪽이든 좋지만 **하나는 반드시 없앤다.** 남겨두면 쓰이지 않는 쪽이 dead가 되고,
나중에 그걸 고치면서 화면은 안 바뀌는 혼란이 생긴다.

**`constants/tmdb.ts` 추가 규칙**
- `tmdbImageUrl()` **밖에서 URL 문자열을 조립하는 코드가 있으면 리뷰에서 반려**한다
- `path`가 `/`로 시작하므로 base와의 사이에 슬래시를 넣지 않는다

---

## 3. `src/components/primitives/`

**스타일링 라이브러리 교체 비용을 이 폴더 안에 가두는 것이 목적이다.**
화면은 `View`/`Text`를 직접 쓰지 않고 아래를 쓴다.

| 컴포넌트 | 역할 | 핵심 props |
|---|---|---|
| `Screen` | 화면 루트. SafeArea + 배경색 + 기본 패딩 | `scroll?`, `padded?`, `edges?` |
| `Txt` | 모든 텍스트. `typography` 프리셋 적용 | `variant: 'h1'\|'h2'\|'h3'\|'h4'\|'body'\|'caption'`, `color?`, `numberOfLines?` |
| `Card` | 카드 컨테이너 (border + radius + 배경) | `padded?` |
| `Button` | 기본/보조/위험 3종 | `variant`, `loading`, `disabled`, `onPress` |
| `Divider` | 구분선 | — |
| `Spacer` | 여백 | `size: keyof typeof spacing` |

**규칙**
1. **화면 코드에 `<Text>`가 직접 등장하면 안 된다.** RN의 `Text`는 기본 폰트·색이 플랫폼마다
   달라, 직접 쓰기 시작하면 타이포가 조용히 갈라진다.
2. `Button`의 `loading` 상태는 **버튼 크기를 유지**해야 한다(스피너로 바꾸면서 레이아웃이
   튀지 않게). M2-B의 모든 저장 액션이 이걸 쓴다.
3. `Screen`은 `edges`로 SafeArea 방향을 제어한다. **탭 화면은 `bottom`을 제외**한다
   (탭바가 이미 처리) — 상위 스펙 §8.4의 `pb-20` 문제와 같은 뿌리다.

### `src/components/common/`

| 컴포넌트 | 용도 |
|---|---|
| `LoadingState` | 스켈레톤 또는 스피너. 리스트/상세 2가지 프리셋 |
| `ErrorState` | 메시지 + `다시 시도` 버튼 (`onRetry`) |
| `EmptyState` | 아이콘 + 안내 문구 + 선택적 CTA (`title`, `description`, `action?`) |
| `ScreenHeader` | 네이티브 헤더를 못 쓰는 예외 화면용 |
| `ActionSheet` | `Modal` 기반 하단 시트. 드롭다운 대체 |

> **M2-A에서 이 5개를 먼저 만든다.** M2-B에서 화면을 만들며 급조하면 화면마다 로딩/에러
> 모양이 달라진다. 3군 플레이스홀더도 `EmptyState`를 재사용한다.

---

## 4. `src/api/` — 인증 인터셉터가 이 단계의 핵심

### 4.1 의존 방향 — 순환을 만들지 않는다

```
client.ts ──► authStore (getState / setState)
authStore ──► expo-secure-store 만
api/*.ts  ──► client.ts
hooks/*   ──► api/*.ts + authStore
```

> ⚠️ **`authStore`가 API를 호출하게 만들지 말 것.** `authStore → api/auth.ts → client.ts →
> authStore` 순환이 생긴다. **로그인/로그아웃 요청은 `hooks/useAuth.ts`가 수행**하고,
> `authStore`는 **상태와 SecureStore 영속화만** 담당한다.

### 4.2 `src/api/client.ts`

**두 개의 axios 인스턴스를 만든다.**

```ts
export const api = axios.create({ baseURL: BASE_URL });   // 앱 전역. 인터셉터 있음
const bare = axios.create({ baseURL: BASE_URL });          // 재발급 전용. 인터셉터 없음
```

`bare`를 따로 두는 이유 — `reissue` 호출이 `api`를 타면 **그 요청의 401이 다시 인터셉터를
깨워 재귀**한다. 스킵 플래그로 우회하는 것보다 인스턴스를 나누는 편이 사고가 없다.

#### 요청 인터셉터 — 만료 전에 미리 갱신한다

```ts
api.interceptors.request.use(async (config) => {
  if (config.url?.startsWith('/api/auth/')) return config;      // 인증 경로는 손대지 않는다

  const { accessToken, accessTokenExpiresAt } = useAuthStore.getState();
  if (accessToken && accessTokenExpiresAt - Date.now() < 60_000) {
    try {
      await refreshOnce();                                       // 만료 60초 전 선제 갱신
    } catch (e) {
      await useAuthStore.getState().logout();
      throw e;   // ★ 여기서 멈춘다. 토큰 없이 보내면 401을 한 번 더 받을 뿐이다
    }
  }
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

- `accessTokenExpiresAt`은 로그인/재발급 응답의 `accessTokenExpiresIn`(초)로 계산해 저장한다.
- **선제 갱신이 401 폭풍의 대부분을 없앤다.** 아래 응답 인터셉터는 그래도 새는 것을 위한 안전망이다.

#### ★ 단일 비행(single-flight) 재발급

**M2에서 가장 터지기 쉬운 지점이다** (상위 스펙 §6.3). 백엔드가 **리프레시 회전 + 재사용
감지**를 구현하고 있어, 동시 401에서 각자 `reissue`를 호출하면 두 번째가
`REFRESH_TOKEN_REUSED`를 맞고 **해당 유저의 전 세션이 폐기된다.**

```ts
let refreshPromise: Promise<string> | null = null;

function refreshOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const rt = await useAuthStore.getState().getRefreshToken();
      if (!rt) throw new Error('NO_REFRESH_TOKEN');
      const { data } = await bare.post('/api/auth/reissue', { refreshToken: rt });
      await useAuthStore.getState().setTokens(data);   // ★ 새 refreshToken도 반드시 저장
      return data.accessToken;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;   // 동시 호출은 전부 같은 Promise를 기다린다
}
```

**절대 지킬 것 4가지**

1. `refreshPromise`를 `finally`에서 **반드시 null로 되돌린다**(성공·실패 모두). 안 그러면
   한 번 실패한 뒤 영원히 갱신이 안 된다.
2. **응답의 `refreshToken`을 저장한다.** 회전되므로 이전 값은 이미 죽었다. 이걸 빠뜨리면
   다음 갱신에서 재사용 감지에 걸린다 — **증상이 "한참 잘 쓰다가 갑자기 전부 로그아웃"이다.**
3. `reissue` 자체가 실패하면 **즉시 로그아웃**하고 재시도하지 않는다.
4. 원 요청 재시도는 **1회만**. `config._retried` 플래그로 막는다.

#### 응답 인터셉터

```ts
api.interceptors.response.use(undefined, async (error) => {
  const { response, config } = error;
  if (response?.status !== 401 || config._retried) throw error;
  if (config.url?.startsWith('/api/auth/')) throw error;

  const code = response.data?.code;
  if (code !== 'TOKEN_EXPIRED') {          // INVALID_TOKEN / REFRESH_TOKEN_REUSED 등
    await useAuthStore.getState().logout();
    throw error;
  }
  try {
    const token = await refreshOnce();
    config._retried = true;
    config.headers.Authorization = `Bearer ${token}`;
    return api.request(config);
  } catch {
    await useAuthStore.getState().logout();
    throw error;
  }
});
```

**에러 코드 분기표** (상위 스펙 §6.3)

| `code` | 처리 |
|---|---|
| `TOKEN_EXPIRED` | 갱신 후 재시도 |
| `INVALID_TOKEN` · `REFRESH_TOKEN_NOT_FOUND` · `REFRESH_TOKEN_REUSED` | **즉시 로그아웃** |
| `INVALID_CREDENTIALS` | 인터셉터 개입 없음 — 폼에 표시 |
| `INVALID_NONCE` | nonce 재발급 후 재시도 (카카오 플로우) |

#### 에러 정규화

모든 에러를 `ApiError`로 변환해 화면이 axios를 몰라도 되게 한다.

⚠️ **`Error`를 상속한 클래스로 만든다.** plain object를 `throw`하면 스택 추적이 사라지고
`instanceof Error` 검사가 실패해 에러 바운더리·로깅 품질이 떨어진다.

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: { field: string; reason: string }[] = [],  // 백엔드 errors[]
    readonly isNetwork = false,                                       // 응답 자체가 없을 때
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

`fieldErrors`를 `react-hook-form`의 `setError`에 그대로 매핑할 수 있어야 한다(M2-B 폼 전부가 쓴다).

### 4.3 `src/api/endpoints.ts`

경로 문자열의 **단일 출처**. 화면·훅에 리터럴 경로가 등장하면 안 된다.

```ts
export const EP = {
  auth: { signup: '/api/auth/signup', login: '/api/auth/login', nonce: '/api/auth/nonce',
          oauth: (p: string) => `/api/auth/oauth/${p}`, reissue: '/api/auth/reissue',
          logout: '/api/auth/logout' },
  movies: { search: '/api/movies/search', detail: (id: number) => `/api/movies/${id}`,
            cast: (id: number) => `/api/movies/${id}/cast`, sync: '/api/movies/sync',
            wish: (id: number) => `/api/movies/${id}/wish`,
            review: (id: number) => `/api/movies/${id}/review`,
            reviews: (id: number) => `/api/movies/${id}/reviews` },
  records: { create: '/api/records', byId: (id: number) => `/api/records/${id}`,
             representative: (id: number) => `/api/records/${id}/representative`,
             ofUser: (uid: number) => `/api/users/${uid}/records`,
             ofUserMovie: (uid: number, mid: number) => `/api/users/${uid}/records/movies/${mid}` },
  // … wishes · collections · users · comments · theaters · boxOffice
} as const;
```

### 4.4 목 어댑터

각 `api/*.ts`는 **실제 구현과 동일한 시그니처**를 갖는 목을 `api/mock/`에 둔다.

```ts
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
export const movieApi = USE_MOCK ? mockMovieApi : realMovieApi;
```

- 목은 `await delay(300)`으로 지연을 흉내 낸다 → **로딩 UI를 M2-B에서 미리 검증**할 수 있다.
- 목 데이터는 와이어프레임의 하드코딩 값(인터스텔라·기생충 등)을 `api/mock/fixtures.ts`로 옮긴다.
- ⚠️ **목 응답도 실제 DTO 필드명을 그대로 쓴다.** `posterPath`(O) / `posterUrl`(X).
  여기서 어긋나면 실제 연동 시 화면을 전부 고쳐야 한다.

---

## 5. `src/store/authStore.ts`

**상태와 SecureStore 영속화만 담당한다. API를 호출하지 않는다** (§4.1).

```ts
type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;              // ★ 3상태. boolean 2개로 쪼개지 말 것
  user: UserResponse | null;
  accessToken: string | null;
  accessTokenExpiresAt: number;    // epoch ms. accessTokenExpiresIn(초)로 계산

  restore(): Promise<void>;                    // 부팅 시 1회
  setTokens(t: TokenResponse): Promise<void>;  // 로그인·재발급 공통
  setUser(u: UserResponse): void;
  getRefreshToken(): Promise<string | null>;
  logout(): Promise<void>;
}
```

**규칙**

1. **`status`를 `isLoading`/`isLoggedIn` 두 boolean으로 쪼개지 않는다.** 부팅 중과 비로그인이
   구분되지 않으면 §6의 스플래시 깜빡임을 막을 수 없다.
2. **`refreshToken`은 상태에 두지 않는다.** SecureStore에만 두고 `getRefreshToken()`으로 그때그때
   읽는다. 메모리 상태로 들고 있으면 회전 후 갱신 누락이 조용히 발생한다.
3. `accessToken`은 매 요청 헤더에 필요하므로 메모리 상태로 둔다(SecureStore에도 저장하되
   읽기는 메모리에서).
4. `logout()`은 ① SecureStore 삭제 ② 상태 초기화 ③ `queryClient.clear()` 세 가지를 모두 한다.
   **캐시를 안 비우면 다음 로그인 사용자가 이전 사용자의 데이터를 잠깐 본다.**
5. ⚠️ **`restore()` 전체를 `try/catch`로 감싼다.** `JSON.parse(userJson)`이나 SecureStore
   호출이 던지면 `status`가 `'loading'`에 갇히고 App.tsx가 `return null`을 계속 실행해
   **앱이 스플래시에서 영구 정지한다**(재설치 외 복구 불가). Android 키스토어가 백업·복원 후
   깨지는 알려진 케이스가 있어 가상의 위험이 아니다.
   ```ts
   async restore() {
     try { /* 기존 로직 */ }
     catch {
       // 삭제 자체가 던져도(키스토어가 깨진 경우) set()이 실행되지 않으면
       // status가 'loading'에 그대로 갇힌다 — 삭제 실패를 흡수해 set()을 항상 보장한다.
       try { await Promise.all([/* 세 키 모두 삭제 */]); } catch {}
       set({ status: 'anonymous', user: null, accessToken: null, accessTokenExpiresAt: 0 });
     }
   }
   ```
   App.tsx의 호출부에도 `.catch()`를 단다. **이때 catch가 아무것도 하지 않으면(`.catch(() => {})`)
   안전망이 아니다** — `restore()`가 정말로 던지는 미지의 경로가 있다면 상태가 그대로
   `'loading'`에 남기 때문이다. 반드시 상태를 직접 바꾼다.
   ```ts
   useAuthStore.getState().restore()
     .catch(() => useAuthStore.setState({ status: 'anonymous' }));
   ```
   **M2-A 완료 판정이 부팅 시퀀스이므로 이 경로에 안전망이 없으면 완료가 아니다.**
6. `logout()`은 **서버 호출을 하지 않는다.** `POST /api/auth/logout`은 `hooks/useLogout`이
   먼저 호출하고 성공·실패와 무관하게 `authStore.logout()`을 부른다 — 네트워크가 죽어도
   로컬 로그아웃은 되어야 한다.

**SecureStore 키**: `cinemory.accessToken`, `cinemory.refreshToken`, `cinemory.user`
⚠️ SecureStore는 값 크기 제한(약 2KB)이 있다. `user`는 작으니 괜찮지만 토큰 외 큰 객체를 넣지 말 것.

---

## 6. 부팅 시퀀스 — 스플래시 깜빡임을 막는다

```
App 마운트
 └─ SplashScreen.preventAutoHideAsync()      ← 최상단에서 즉시
     └─ authStore.restore()                   ← SecureStore 읽기
         └─ status: 'loading' → 'authenticated' | 'anonymous'
             └─ RootNavigator 렌더 후 SplashScreen.hideAsync()
```

```tsx
// App.tsx (골자)
SplashScreen.preventAutoHideAsync();          // 모듈 최상단. 컴포넌트 안이 아니다

export default function App() {
  const status = useAuthStore(s => s.status);
  useEffect(() => {
    useAuthStore.getState().restore();   // restore() 내부가 자체 try/catch로 절대 던지지 않는다 (§5 규칙 5)
  }, []);

  const onReady = useCallback(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;      // 스플래시가 아직 떠 있다

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer onReady={onReady}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

⚠️ **`restore()`가 던지면 `status`가 `'loading'`에 갇혀 앱이 스플래시에서 영구 정지한다.**
§5 규칙 5대로 `restore()` 내부에서 모든 예외를 삼키고 최소한 `'anonymous'`로 떨어뜨린다.
호출부에도 `.catch()`를 달아 두 겹으로 막는다.

⚠️ **`preventAutoHideAsync()`를 컴포넌트 안에서 호출하면 늦는다.** 모듈 최상단에 둔다.
빠뜨리면 앱 실행마다 **로그인 화면이 한 번 번쩍였다가 메인으로 넘어간다.**

### QueryClient 기본값

```ts
new QueryClient({ defaultOptions: { queries: {
  retry: (count, err) => (err as ApiError)?.status >= 500 && count < 2,   // 4xx는 재시도 안 함
  staleTime: 30_000,
  refetchOnWindowFocus: false,     // RN에서는 의미가 다르다
}}});
```

⚠️ **401을 react-query가 재시도하게 두면 안 된다.** 인터셉터가 이미 갱신·재시도를 처리하므로
이중 재시도가 되고, 최악의 경우 재사용 감지를 유발한다. 위 `retry` 조건이 그것을 막는다.

---

## 7. `src/hooks/` — 시그니처만 (구현은 M2-B)

화면이 의존하는 유일한 계층. **M2-A에서는 시그니처와 queryKey 규약만 확정**한다.

### queryKey 규약

```ts
['movies', 'search', { query, year }]
['movies', 'detail', movieId]
['movies', 'cast', movieId]
['records', 'ofUser', userId]
['records', 'ofUserMovie', userId, movieId]
['reviews', 'me', movieId]
['wishes', 'me', movieId]
['collections', 'ofUser', userId]
['users', 'me']
```

**규칙** — 첫 요소는 도메인, 둘째는 동작, 셋째부터 식별자. 이래야 `invalidateQueries(['movies'])`
같은 광역 무효화가 가능하다.

### 무효화 매트릭스 (M2-B에서 쓴다)

| 액션 | 무효화 대상 |
|---|---|
| 시청 기록 생성/수정/삭제 | `['records']`, `['movies','detail',movieId]` |
| 리뷰 upsert/삭제 | `['reviews']`, `['movies','reviews',movieId]` |
| 찜 토글 | `['wishes']` — **낙관적 업데이트 후 무효화** |
| 컬렉션 영화 추가/제거 | `['collections']` |
| 프로필 수정 | `['users','me']` |

### 훅 목록 (M2-A는 파일과 시그니처만)

`useLogin` · `useSignUp` · `useKakaoLogin` · `useLogout` · `useMe`
`useMovieSearch`(무한) · `useMovieDetail` · `useMovieSync`
`useMyRecords`(무한) · `useWatchLog` · `useCreateRecord` · `useDeleteRecord`
`useMyReview` · `useWriteReview` · `useDeleteReview`
`useWishToggle` · `useIsWished` · `useMyWishes`(무한)
`useMyCollections` · `useCollectionMovies` · `useCreateCollection`

⚠️ **무한 스크롤 훅은 `getNextPageParam`을 `last` 기준으로 짠다** (상위 스펙 §5.1).
`content.length === 0`으로 판정하면 비공개 리뷰가 필터링된 페이지에서 조기 종료된다.
⚠️ **`useMovieSearch`만 `page`가 1-based다.** `initialPageParam: 1`.

---

## 8. `src/navigation/` — M2-A의 최종 산출물

### 8.1 파일 구성

```
navigation/
├── types.ts               # 상위 스펙 §8.3 ParamList 전체
├── RootNavigator.tsx      # status로 Auth ↔ Main 분기
├── AuthNavigator.tsx
├── MainTabNavigator.tsx
└── stacks/
    ├── HomeStack.tsx  RecommendStack.tsx  CineMapStack.tsx
    ├── SocialStack.tsx  MyPageStack.tsx
```

### 8.2 `RootNavigator`

```tsx
const status = useAuthStore(s => s.status);
return status === 'authenticated' ? <MainTabNavigator /> : <AuthNavigator />;
```

⚠️ **화면에서 수동으로 `navigate('Main')`을 호출하지 않는다.** 로그인 성공 시
`authStore.setTokens()` + `setUser()`만 부르면 이 분기가 알아서 바뀐다. 수동 네비게이션을
섞으면 로그아웃 시 스택이 남아 이전 사용자 화면이 잠깐 보인다.

### 8.3 플레이스홀더 화면

**M2-A에서 모든 화면을 만든다. 내용은 비운다.**

```tsx
// src/screens/_placeholder.tsx
export function makePlaceholder(title: string, note?: string) {
  return function Placeholder() {
    return <Screen><EmptyState title={title} description={note ?? '준비 중입니다'} /></Screen>;
  };
}
```

| 스택 | 플레이스홀더 |
|---|---|
| Auth | Login · SignUp · PasswordResetRequest · PasswordResetConfirm |
| Home | Home · SearchResult · MovieDetail |
| MyPage | MyPage · EditProfile · Settings · MyRecords · Wishlist · CollectionList · CollectionDetail · Report |
| Recommend / CineMap / Social | 각 루트 1개씩 — **3군이므로 M2 내내 플레이스홀더로 남을 수 있다** |

3군 플레이스홀더 문구는 "준비 중"이 아니라 **왜 비어 있는지**를 적는다 —
예: CineMap은 *"상영관 데이터 준비 중"*(B-9). 데모 때 빈 화면을 설명할 수 있어야 한다.

### 8.4 탭 설정

상위 스펙 §8.4 그대로. 추가 주의:

- `screenOptions.tabBarStyle`에 높이 `64 + insets.bottom`
- **`unmountOnBlur`를 켜지 않는다** — 탭 전환마다 재조회가 일어나고, CineMap의 WebView가
  매번 재로딩된다(§13).
- 아이콘은 `lucide-react-native`의 `Home` · `Film` · `Map` · `Users` · `User`

---

## 9. 검증 체크리스트

**아래를 전부 통과해야 M2-A 완료다.** 하나라도 미루면 M2-B에서 몇 배로 돌아온다.

| # | 항목 | 확인 방법 |
|---|---|---|
| 1 | `npx expo-doctor` 통과 | |
| 2 | 스타일링 라이브러리가 **실기기에서** 실제로 적용됨 | §1-B 4개 항목 |
| 3 | `src/types/api.d.ts` 생성·커밋됨 | `MovieDetailResponse` 등이 들어 있는지 |
| 4 | 생성 타입에 `viewerId` 같은 쿼리 파라미터가 **없음** | 있으면 백엔드 회귀 (상위 스펙 §4) |
| 5 | **앱 실행 시 로그인 화면이 깜빡이지 않음** | 토큰 있는 상태로 재실행 |
| 6 | 토큰 삭제 후 재실행 시 로그인 화면으로 진입 | |
| 7 | 탭 5개 · 모든 하위 화면 이동·복귀 | 안드로이드 **하드웨어 뒤로가기**로도 |
| 8 | **동시 401에서 `reissue`가 1회만 호출됨** | 아래 참고 |
| 9 | 화면 코드에 색상 리터럴·`<Text>`·경로 문자열이 없음 | grep |

### 8번 검증법 — 반드시 해볼 것

이게 M2에서 가장 비싼 버그다. 수동으로 재현한다.

```
1. 백엔드 access-token-ttl을 임시로 PT10S로 낮춘다
2. 로그인 후 10초 대기
3. 한 화면에서 3~4개 쿼리가 동시에 나가게 한다 (예: MovieDetail 진입)
4. 백엔드 로그에서 POST /api/auth/reissue 호출 횟수를 센다
```

**1회여야 한다.** 2회 이상이면 두 번째가 `REFRESH_TOKEN_REUSED`를 맞고 전 세션이 폐기된다.
검증 후 `access-token-ttl`을 **`PT30M`으로 되돌릴 것**(런북의 `nonce-ttl` 사고와 같은 유형이다 —
검증용으로 바꾼 값을 되돌리지 않으면 나중에 원인 불명 증상이 된다).

---

## 10. 하지 않을 것 (M2-A 범위 밖)

경계를 명시해 둔다. 여기 손대기 시작하면 M2-A가 안 끝난다.

- 화면 내용 구현 (전부 M2-B 이후)
- 프로필 사진 업로드 — `user.profile_image` 저장 위치 미결(security-spec **L-13**),
  **되돌리기가 가장 비싼 결정**이므로 기능을 만들기 전에 정한다
- 카카오 로그인 **실동작** — `useKakaoLogin` 시그니처만 만들고 SDK는 붙이지 않는다.
  prebuild가 필요하다 (상위 스펙 §11.1).
  ⚠️ **`@react-native-kakao/*` 패키지를 `dependencies`에 두지도 않는다.** config plugin만
  지우고 패키지를 남기면 잠복 상태가 되고, 나중에 플러그인을 다시 등록하는 순간 같은 사고가
  재발한다 — `nativeAppKey` 없이 등록된 플러그인은 **expo CLI 전체를 죽인다.**
  prebuild 시점에 설치한다
- 차트 라이브러리 — 2군에서 설치
- 지도 — 3군 (§13)
- 정렬·필터 UI — 서버가 지원하지 않는다 (상위 스펙 §9.4)

---

## 11. 구현 리뷰 결과 — 수정 지시 (2026-08-28)

첫 구현본을 스펙과 대조하고 **Tailwind를 실제로 컴파일해** 검증한 결과다.

### 통과

인터셉터가 §4.2 핵심을 정확히 구현했다 — `bare` 인스턴스 분리, `refreshPromise`의 `finally`
복원, **회전된 refreshToken 저장**, `_retried` 1회 제한, 선제 갱신, 에러 코드 분기.
`authStore`도 3상태·refreshToken 비보관·`queryClient.clear()`까지 맞다.
**순환도 실제로 없다** — `authStore → api/queryClient`가 생겼지만 `queryClient.ts`가
`import type { ApiError }`(타입 전용)를 써서 런타임 그래프에 사이클이 없다.

실컴파일 검증 2건:
- ✅ `borderRadius` 숫자값에 Tailwind가 `px`를 자동 부착한다 (`rounded-md` → `10px`)
- ✅ **코드에서 쓰는 Tailwind 클래스 중 미생성은 하나도 없다** (전수 대조)

### 수정 목록

| # | 심각도 | 항목 | 반영 위치 |
|---|---|---|---|
| 1 | **높음** | `restore()`에 `try/catch` 없음 → **스플래시 영구 정지** | §5 규칙 5 |
| 2 | **중간** | Tailwind 색상 키가 camelCase → 와이어프레임 kebab 클래스 미생성 | §2 |
| 3 | 중간 | `typography`가 `tokens.ts`·`Txt.tsx` 양쪽에 중복 (tokens 쪽은 dead) | §2 |
| 4 | 중간 | `@react-native-kakao/*` 2종이 `dependencies`에 잔존 | §10 |
| 5 | 낮음 | 요청 인터셉터가 갱신 실패 후에도 요청을 발사 | §4.2 |
| 6 | 낮음 | `ApiError`가 `Error` 인스턴스가 아님 | §4.2 |
| 7 | 낮음 | `UserResponse`에 `profileImage`·`privacySetting` 누락 | 아래 |
| 8 | 낮음 | `WriteReviewRequest`에 `movieId`가 있음 — 실제로는 경로 변수 | 아래 |

**2번을 지금 고치는 것이 결정적으로 싸다** — 화면이 0개인 지금은 `tailwind.config.js`와
`Txt.tsx` 두 파일이지만, M2-B 이후엔 전 화면이다.

**7·8 — 손으로 쓴 임시 타입의 계약 이탈**

`src/types/index.ts`는 `api.d.ts` 생성 전까지의 임시본이다. 상위 스펙 §6.1·§5.3과 맞춘다.

```ts
export interface UserResponse {
  id: number; email: string; nickname: string;
  profileImage: string | null;          // ★ 누락됨. MyPage가 바로 쓴다
  privacySetting: PrivacySetting;       // ★ 누락됨
}
export interface WriteReviewRequest { rating: number; content: string; }   // movieId는 경로 변수
```

⚠️ **`npm run gen:api`가 성공하는 즉시 이 파일을 생성 타입 별칭으로 교체한다.** 손으로 쓴
타입은 반드시 어긋나며, v1 스펙이 정확히 그렇게 실패했다(상위 스펙 §0).

**참고 — `.npmrc`의 `legacy-peer-deps=true`**

`openapi-typescript@7`의 `typescript@^5` peer가 이 프로젝트의 `typescript@~6`과 충돌하는 것을
푼 조치이며 근거는 타당하다(devDependency CLI라 프로젝트 tsc 버전과 무관). 다만 **전역
설정이라 앞으로 모든 peer 충돌이 조용히 무시된다** — M2-B에서 진짜 충돌이 나도 보이지 않는다.
`overrides`로 `typescript`만 좁게 처리하는 편이 안전하고, 그대로 둔다면 이 위험을 인지한 채 쓴다.

### 수정본 재검증 (2026-08-28)

8건 전부 반영 확인. Tailwind를 다시 컴파일해 **코드에서 쓰는 클래스 전수 대조**를 다시 돌렸고
미생성은 없었다. kebab 클래스(`text-muted-foreground` · `text-primary-foreground` · `bg-card` ·
`border-border`)가 모두 생성된다.

**남은 구멍 1건 — `restore()`의 catch 블록이 스스로 던질 수 있다**

```ts
} catch {
  await Promise.all([ SecureStore.deleteItemAsync(...) ×3 ]);   // ← 여기가 던지면?
  set({ status: 'anonymous', ... });                            // ← 도달하지 못한다
}
```

**막으려던 시나리오가 바로 "SecureStore가 깨진 경우"** 인데, 그 상황에서는 `deleteItemAsync`도
같이 실패할 수 있다. 그러면 `restore()`가 reject하고, App.tsx의 `.catch(() => {})`가 조용히
삼키지만 **`status`를 바꾸지 않아 여전히 `'loading'`에 갇힌다.** 이중 안전망이 실제로는
아무것도 받아내지 못한다.

```ts
// authStore — 삭제 실패를 흡수한다
} catch {
  try { await Promise.all([/* 세 키 삭제 */]); } catch { /* 삭제도 실패하면 무시 */ }
  set({ status: 'anonymous', user: null, accessToken: null, accessTokenExpiresAt: 0 });
}

// App.tsx — 진짜 안전망은 상태를 바꿔야 한다
.catch(() => useAuthStore.setState({ status: 'anonymous' }));
```

**선택 — `queryClient.retry`를 `instanceof`로**

`ApiError`가 이제 클래스이므로 `(err as unknown as ApiError)` 캐스팅이 불필요하다.
`err instanceof ApiError && err.status >= 500 && count < 2`가 더 안전하다.

### 남은 실물 검증

**→ 절차는 §12를 따른다.** `src/types/api.d.ts` 생성(`npm run gen:api`)도 §12-0에 포함돼 있다.

---

## 12. 실기기 검증 절차

> 여기까지 통과해야 **M2-A 완료**다. 환경 문제로 한 시간을 날리기 쉬우니 §12-0을 먼저 끝낸다.

### 12-0. 사전 준비 — 여기서 대부분 막힌다

| # | 할 것 | 확인 |
|---|---|---|
| 1 | 폰과 PC를 **같은 Wi-Fi**에 둔다 | 게스트망·5GHz 분리망 주의 |
| 2 | PC의 LAN IP 확인 (`ipconfig`) | `192.168.x.x` |
| 3 | 백엔드 기동 | `./gradlew bootRun` |
| 4 | **`.env`에 `EXPO_PUBLIC_API_BASE_URL=http://<LAN IP>:8080`** | ⚠️ `localhost`는 **폰 자신**을 가리킨다 |
| 5 | **Windows 방화벽 8080 인바운드 허용** | 폰 브라우저로 `http://<LAN IP>:8080/api/movies` 열어 JSON이 오는지 |
| 6 | `npm run gen:api` 실행 → `src/types/api.d.ts` 생성·커밋 | 백엔드가 떠 있는 지금이 적기 |
| 7 | 생성 타입으로 `src/types/index.ts` 교체 | §11 참고 |
| 8 | `npx expo start` → Expo Go로 QR 스캔 | |

> 5번에서 JSON이 안 오면 **앱 문제가 아니다.** 방화벽·Wi-Fi부터 해결한다.
> Android에서 앱만 통신이 안 되면 **cleartext HTTP 차단**을 의심한다(Expo Go는 개발 중 허용).

### 12-1. 디버그 프로브 화면 — A·B·D의 공통 전제

**M2-A에는 화면이 없어서 아무것도 눌러볼 수 없다.** 임시 화면 하나를 만들면 아래 검증
셋이 전부 가능해진다. `__DEV__` 가드를 걸고 **커밋하지 않는다**(또는 검증 후 되돌린다).

`HomeStack`의 `Home` 자리에 임시로 끼우고, 아래 4개를 둔다.

| 요소 | 용도 |
|---|---|
| 스타일 프로브 블록 | `bg-primary` · `text-muted-foreground` · `text-primary-foreground` · `rounded-lg` · `bg-card border border-border` |
| `로그인` 버튼 | 하드코딩 계정으로 `POST /api/auth/login` → `authStore.setTokens()` + `setUser()` |
| `동시요청 ×4` 버튼 | `Promise.all([api.get(EP.users.me) ×4])` |
| `로그아웃` 버튼 | `authStore.logout()` |

추가로 `refreshOnce()` 안에 `console.log('[reissue]', Date.now())`를 **임시로** 넣는다 —
D 검증의 계측 지점이다.

---

### A. 스타일링 육안 확인 — §1-B 판정 3번 (유일한 미완)

| 확인 | 통과 기준 |
|---|---|
| `bg-primary` 블록 | **시안(#14D9D9)** 배경 |
| `text-muted-foreground` | 회색(#717182) 글자 |
| `text-primary-foreground` on `bg-primary` | 흰 글자 |
| `rounded-lg` | 모서리가 **둥글다**(12px) |
| `bg-card border border-border` | 흰 카드에 옅은 테두리 |

⚠️ **className이 무시돼도 앱은 정상 실행된다.** 번들 성공·`tsc` 통과로는 판정할 수 없어서
이 항목만 육안 확인이 필요하다. 회색·각진 모서리로 보이면 NativeWind 배선이 안 된 것이다.

### B. 부팅 시퀀스 — §9 체크리스트 5·6

| # | 시나리오 | 통과 기준 |
|---|---|---|
| B-1 | **비로그인 콜드 스타트** (앱 삭제 후 재설치, 또는 `로그아웃` 후 앱 완전 종료→재실행) | 스플래시 → **로그인 화면.** 메인 탭이 한 프레임도 보이면 안 된다 |
| B-2 | **로그인 콜드 스타트** (`로그인` 버튼 → 앱 완전 종료 → 재실행) | 스플래시 → **메인 직행.** 로그인 화면이 번쩍이면 안 된다 |
| B-3 | **restore 실패 폴백** — SecureStore의 `cinemory.user`에 깨진 JSON(`{{{`)을 심고 재실행 | 스플래시에 **갇히지 않고** 로그인 화면으로 떨어진다 |

> B-3이 §11 수정 1번의 실검증이다. 프로브 화면에 *"user 키 오염"* 버튼
> (`SecureStore.setItemAsync('cinemory.user', '{{{')`)을 하나 더 두면 쉽다.
> **스플래시에서 멈추면 수정이 불완전한 것이다** — §11의 남은 구멍을 먼저 막는다.

### C. 네비게이션 — §9 체크리스트 7

| # | 시나리오 | 통과 기준 |
|---|---|---|
| C-1 | 탭 5개 순회 | 전부 열리고 아이콘·라벨 정상 |
| C-2 | MyPage → 하위 화면 진입 → **안드로이드 하드웨어 뒤로가기** | 이전 화면으로 복귀 |
| C-3 | 탭 A에서 깊이 진입 → 탭 B → 탭 A 복귀 | **깊이가 유지된다**(독립 히스토리) |
| C-4 | 탭 루트에서 뒤로가기 | 앱이 종료된다(스택이 남지 않음) |
| C-5 | 하단 탭바가 콘텐츠를 가리지 않는다 | `pb-20` 잔재로 하단이 비어 보이지도 않는다 |

### D. ★ 동시 401에서 `reissue` 1회 — §9 체크리스트 8

**M2에서 가장 비싼 버그의 검증이다.** 실패해도 증상이 "가끔 혼자 로그아웃"이라 나중에
발견하면 원인 추적에 오래 걸린다.

```
1. 백엔드 application.yml → jwt.access-token-ttl: PT10S      ← 임시
2. 백엔드 재기동
3. 앱에서 `로그인` 버튼 → 성공 확인
4. 15초 대기 (access token 만료)
5. `동시요청 ×4` 버튼 탭
6. Metro 콘솔에서 [reissue] 로그 개수를 센다
```

| 결과 | 판정 |
|---|---|
| `[reissue]` **1회** + 요청 4개 모두 200 + 로그인 유지 | ✅ 통과 |
| `[reissue]` 2회 이상 | ❌ 단일 비행 실패 |
| 앱이 로그인 화면으로 튕김 | ❌ 두 번째 `reissue`가 `REFRESH_TOKEN_REUSED`를 맞고 **전 세션이 폐기된 것** |

**교차 확인** — 백엔드에서 `logging.level.org.springframework.web=DEBUG`를 임시로 켜면
`POST /api/auth/reissue` 수신 횟수를 서버 쪽에서도 셀 수 있다. 앱 로그와 일치해야 한다.

**추가 케이스 (여유가 있으면)**

| # | 시나리오 | 기대 |
|---|---|---|
| D-2 | 선제 갱신 경로 — 만료 **5초 전**에 요청 1개 | 401 없이 갱신 후 성공 |
| D-3 | refresh 만료 — DB에서 해당 refresh token을 지우고 요청 | 즉시 로그아웃, 재시도 없음 |
| D-4 | 네트워크 차단(비행기 모드) 상태로 요청 | `isNetwork: true`로 정규화, 로그아웃되지 않음 |

### E. 마무리 — 되돌리기 체크리스트

**검증용으로 바꾼 것을 되돌리지 않으면 나중에 원인 불명 증상이 된다.**
이 프로젝트에서 이미 두 번 발생했다(런북 `nonce-ttl`, 그리고 아래 1번).

- [ ] 백엔드 `jwt.access-token-ttl` → **`PT30M`**
- [ ] 백엔드 로그 레벨 원복
- [ ] 프로브 화면 제거 (또는 `__DEV__` 가드 확인 후 커밋 제외)
- [ ] `refreshOnce()`의 임시 `console.log` 제거
- [ ] SecureStore 오염 데이터 정리 (`로그아웃` 버튼)
- [ ] 결과를 §9 체크리스트에 기록

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-08-30 | **§11 "남은 구멍 1건"을 코드에 반영.** `authStore.restore()`의 catch 블록 안 `deleteItemAsync` ×3을 내부 try/catch로 한 번 더 감싸 삭제 자체가 실패해도 아래 `set({ status: 'anonymous', ... })`이 항상 실행되도록 고쳤다. `App.tsx`의 `restore().catch(...)`도 빈 콜백(`() => {}`)이 아니라 `useAuthStore.setState({ status: 'anonymous' })`로 바꿔, 미지의 예외가 뚫고 올라와도 실제로 스플래시가 풀리도록 했다 — 기존 `.catch(() => {})`는 겉보기 안전망일 뿐 상태를 바꾸지 않아 조용히 `'loading'`에 갇히는 구조였다. **같은 세션에서 §11의 8건(색상 키 kebab화, `typography` 중복 제거, 카카오 패키지 제거, 요청 인터셉터 갱신 실패 시 재시도 중단, `ApiError`의 `Error` 상속화, `UserResponse`/`WriteReviewRequest` 계약 정정)도 전부 코드에 반영하고 `tsc --noEmit` 통과를 확인했다.** |
| 2026-08-28 | **수정 8건 재검증 + §12 실기기 검증 절차 신설.** 8건 전부 반영을 코드로 확인했고 **Tailwind 전수 대조를 다시 돌려** kebab 클래스가 모두 생성됨을 확인했다(미생성 0건). **남은 구멍 1건을 §11에 기록** — `restore()`의 catch 블록 안 `deleteItemAsync`가 자체 try/catch 없이 들어 있어, **막으려던 시나리오(SecureStore 파손)에서 catch가 스스로 던지면 `set()`에 도달하지 못한다.** App.tsx의 `.catch(() => {})`는 조용히 삼킬 뿐 `status`를 바꾸지 않아 여전히 스플래시에 갇힌다 — 이중 안전망이 실제로는 아무것도 받아내지 못하는 구조였다. 삭제를 자체 try/catch로 감싸고, App.tsx의 catch가 `status: 'anonymous'`를 **설정하도록** 고친다. **§12는 검증을 절차로 만든 것**이다: ① 12-0(사전 준비)을 앞에 세운 이유는 `localhost`가 실기기에서 폰 자신을 가리키는 것과 Windows 방화벽 8080 차단이 가장 흔한 시간 낭비이기 때문이고, **폰 브라우저로 JSON이 오는지 먼저 보는 것**으로 앱 문제와 네트워크 문제를 분리한다. ② **12-1 디버그 프로브 화면을 공통 전제로 뽑았다** — M2-A에는 화면이 없어 아무것도 눌러볼 수 없는데, 임시 화면 하나(스타일 프로브 + 로그인 + 동시요청×4 + 로그아웃)면 A·B·D가 전부 가능해진다. ③ **B-3(restore 실패 폴백)** 을 추가해 수정 1번이 실제로 동작하는지를 검증 항목으로 만들었다. ④ **D의 계측을 백엔드 로그가 아니라 앱의 `console.log('[reissue]')`로** 잡게 했다 — 훨씬 간단하고 확실하며, 백엔드 DEBUG 로그는 교차 확인용으로 남겼다. ⑤ **E 되돌리기 체크리스트**를 명시했다 |
| 2026-08-28 | **첫 구현본 리뷰 반영 — §11 신설 + §2·§4.2·§5·§10 개정.** 코드를 스펙과 대조하고 **Tailwind를 실제로 컴파일해** 검증했다. **가장 큰 발견은 §2의 색상 키 문제다** — `tailwind.config.js`가 `colors`를 통째로 넘기는데 토큰 키가 `primaryForeground`처럼 camelCase라, 실컴파일 결과 **`text-mutedForeground`는 생성되고 `text-muted-foreground`는 생성되지 않았다.** 와이어프레임 2,387줄이 전부 kebab-case를 쓰므로 그대로 두면 M2-B에서 클래스명을 전부 바꿔야 하고 **NativeWind를 택한 이유 자체가 사라진다.** 중첩 매핑(`primary: { DEFAULT, foreground }`)으로 고치도록 §2를 다시 썼다 — 화면이 0개인 지금은 파일 2개, M2-B 후엔 전 화면이라 **지금 고치는 것이 결정적으로 싸다.** **두 번째는 §5의 `restore()` 예외 처리 부재** — `JSON.parse`나 SecureStore가 던지면 `status`가 `'loading'`에 갇혀 **앱이 스플래시에서 영구 정지**한다(재설치 외 복구 불가). M2-A의 완료 판정이 부팅 시퀀스인데 그 경로에 안전망이 없었다. 그 외 요청 인터셉터의 갱신 실패 후 요청 발사(§4.2), `ApiError`를 `Error` 상속으로 전환(§4.2), 카카오 SDK 패키지 잔존(§10 — 플러그인만 지우고 패키지를 남기면 잠복하다 재등록 시 재발), 임시 타입의 계약 이탈 2건(§11)을 정리했다. **사전 의심 1건은 틀렸음을 실측으로 확인했다** — `borderRadius`에 숫자를 넣으면 단위 없는 CSS가 나올 것으로 봤으나 Tailwind가 `px`를 자동 부착한다(`rounded-md` → `10px`). 코드에서 쓰는 Tailwind 클래스 전수 대조에서도 미생성은 없었다. **순환 의존도 실제로는 없다** — `authStore → api/queryClient`가 생겼지만 `import type`이라 런타임 사이클이 없다 |
| 2026-08-28 | 최초 작성. 상위 스펙 §12의 11단계를 파일 단위로 상세화. **npm 레지스트리 실측으로 스타일링 판단 근거를 확보** — `nativewind@4.2.6`의 `peerDependencies`는 **`{ tailwindcss: '>3.3.0' }` 하나뿐이라 RN·React 버전에 대해 아무 선언이 없는** 반면, `uniwind@1.11.0`은 `react-native >=0.81.0` · `react >=19.0.0` · `tailwindcss >=4`를 **명시**한다(이 프로젝트의 RN 0.85 / React 19.2를 포함). 또 **NativeWind v4를 쓸 때 `tailwindcss`를 `^3.4`로 핀해야 한다**는 것을 발견 — peer 범위가 `>3.3.0`이라 최신 4.3.3도 형식상 통과하지만 NativeWind v4는 Tailwind 3의 `tailwind.config.js` 방식을 전제로 하므로 **조용히 스타일이 안 먹는다.** 판정 기준(§1-B)에 *"실기기에서 실제로 붉게 렌더되는지"* 를 넣은 것도 같은 이유다 — className이 무시돼도 번들·실행은 정상이라 육안 확인 없이는 통과로 착각한다. Expo 56 `bundledNativeModules.json` 대조로 `expo-secure-store`·`reanimated 4.3.1`·`svg 15.15.4`·`webview 13.16.1`·`datetimepicker 9.1.0` 등이 전부 관리 대상임을 확인했고, `lucide-react-native`의 `react-native-svg ^15` peer와 충돌이 없음도 함께 확인했다. **§4.1에서 의존 방향을 못박은 것**은 `authStore → api/auth.ts → client.ts → authStore` 순환을 막기 위해서다 — `authStore`는 상태·영속화만 하고 API 호출은 훅이 한다. **재발급용 axios 인스턴스를 분리(`bare`)** 한 것은 스킵 플래그보다 재귀 사고가 없기 때문이고, **요청 인터셉터의 선제 갱신(만료 60초 전)** 을 추가해 401 폭풍 자체를 줄였다(단일 비행은 그래도 새는 것에 대한 안전망). §9의 8번(동시 401에서 `reissue` 1회) 검증 절차를 구체적으로 적은 것은 **이 버그가 재현이 어렵고 증상이 "가끔 혼자 로그아웃"으로 나타나** 나중에 발견하면 원인 추적에 오래 걸리기 때문이다 |
| 2026-08-28 | **M2-A 구현 착수 — NativeWind v4로 확정하고 §1의 A/B/C 판정 절차를 그대로 밟았다** (Uniwind 대체 시도는 하지 않음. 사용자가 NativeWind v4로 명시 지정). 진행 중 스펙에 없던 차단 이슈 4개를 발견·수정했고, 전부 근거를 남긴다.<br><br>① **`app.json`이 애초에 `expo config`/`expo-doctor`/`expo start` 전체를 죽이고 있었다.** `plugins: ["@react-native-kakao/core"]`가 `nativeAppKey` 없이 등록돼 있어 config-plugin이 매번 `TypeError`로 죽었다 — M2-A 착수 전부터 있던 버그다. 상위 스펙 §10/§11.1이 "카카오 SDK는 M2-A에서 붙이지 않는다(prebuild 필요)"고 명시하므로 플러그인 등록 자체를 제거했다. 카카오 연동 시점(9월 중순 예정)에 `nativeAppKey`와 함께 다시 추가할 것. 같은 파일의 `android.adaptiveIcon.package`도 스키마 오류였다(`package`는 `adaptiveIcon` 하위가 아니라 `android` 직속) — `android.package`로 옮겼다.<br>② **NativeWind v4(`react-native-css-interop`)의 babel 프리셋이 `react-native-worklets/plugin`을 조건 없이 `plugins` 배열에 문자열로 박아 둔다** (`node_modules/react-native-css-interop/babel.js`) — reanimated/worklets를 전혀 안 쓰는 프로젝트라도 설치돼 있지 않으면 `[BABEL] Cannot find module 'react-native-worklets/plugin'`로 번들 자체가 안 뜬다. §0.1 표에 `react-native-reanimated 4.3.1`이 이미 올라가 있던 이유가 이것이었다(원인은 안 적혀 있었음). `npx expo install react-native-reanimated`(4.3.1)와 `react-native-worklets@0.8.x`(reanimated의 명시적 peer, optional 아님)를 설치해 해결. **애니메이션을 실제로 쓰기 전까지도 이 두 패키지는 스타일링 스택의 필수 런타임 의존성**이라는 뜻 — 나중에 "왜 안 쓰는 reanimated가 있지?"로 지우면 다시 깨진다.<br>③ **`openapi-typescript@7.13.0`의 `peerDependencies`가 `typescript@^5.x`인데 프로젝트는 `typescript@~6.0.3`이라 `npm install`/`npx expo install`이 매번 `ERESOLVE`로 실패한다.** openapi-typescript는 devDependency이자 CLI 코드젠 도구일 뿐 프로젝트의 tsc를 실행하지 않으므로 실질적 충돌이 아니라고 판단, `.npmrc`에 `legacy-peer-deps=true`를 추가해 근본적으로 해결(매번 `--legacy-peer-deps`를 손으로 붙이는 대신).<br>④ **`src/types/api.d.ts`는 생성하지 못했다** — 이 환경에 `cinemory-backend`가 없어 `/v3/api-docs`에 접근할 수 없다(§4 "타입 생성이 안 되는 상황"에 해당하지만, 그 경우의 전제인 "커밋된 스냅샷"도 아직 없다 — 최초 생성이라 스냅샷 자체가 없음). 대신 `src/types/index.ts`에 스펙 문서에 **필드가 명시된 계약만**(TokenResponse, 로그인/가입 요청, PageResponse, MovieSearchResponse 등) 손으로 옮겨 뒀고, 필드가 명시되지 않은 나머지(MovieDetailResponse, ReviewResponse 등)는 `unknown`으로 남겨 뒀다 — DTO를 추측해서 쓰지 않는다는 §4 원칙을 지키기 위함. 백엔드가 준비되면 `npm run gen:api` 실행 후 해당 파일 주석에 적힌 대로 교체할 것.<br><br>**검증 결과** — `tsc --noEmit` 통과, `expo-doctor` 통과(SDK 57 Hermes 회귀 권고 1건은 메이저 업그레이드라 M2-A 범위 밖으로 보류, 사용자 판단 필요), `expo export --platform android` 번들 성공(3178 모듈, 에러 없음), dev 번들에 `tokens.ts`의 hex 값(`#14D9D9` 등)과 `cssInterop`/`StyleSheet.create` 호출이 실제로 컴파일돼 들어간 것을 확인. **다만 이 환경에는 실기기·에뮬레이터가 없어 §1-B 3번("실기기에서 실제로 붉게 렌더되는지")과 §9의 5~8번(스플래시 깜빡임, 탭 이동/뒤로가기, 동시 401 재발급 1회)은 물리적으로 검증하지 못했다** — 로직·설정은 스펙대로 짰지만, 다음 세션에서 기기/에뮬레이터로 직접 확인이 필요하다. |
