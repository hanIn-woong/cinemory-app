# 구글 로그인 — 앱 연동 스펙

> **상위 계약은 백엔드 `cinemory-backend/docs/account-integrity-spec.md` D-5**(G-1~G-6, D-5-G 요약)다.
> 이 문서는 그 요약을 **앱 코드 단위로** 풀어 쓴다. 서버 계약(경로·에러 코드)이 이 문서와 다르면 백엔드 문서가 옳다.
> 카카오 로그인의 계약은 `M2-frontend-spec.md` §11.1 — 구글은 같은 뼈대를 따르고 **다른 점만** 여기에 적는다.

- 브랜치: `feature/social-login` (백엔드와 같은 이름, 함께 머지 — 백엔드 S-3)
- 범위: **Android만**(G-6). iOS는 범위 밖(D-5-H) — `app.json`의 `iosUrlScheme`은 플러그인 요구 때문에만 있다

---

## 1. 전제 — 스파이크로 확인된 사실 (2026-10-11, D-5-E)

| 사실 | 코드에 미치는 영향 |
|---|---|
| 라이브러리 `react-native-nitro-google-signin` **2.3.0**, `react-native-nitro-modules` **0.37.1** — 둘 다 정확 고정 | 버전을 올리면 D-5-E 체크리스트 1~3·5·7을 다시 통과해야 한다 |
| **nonce가 `configure()`에 묶여 있다** (함정 1) | 로그인할 때마다 `configure({ webClientId, nonce })`를 **다시** 부른다 |
| nonce를 빼면 라이브러리가 몰래 만든다 (함정 2) | nonce가 없으면 **SDK를 호출하지 않는다** |
| `signIn()`은 이미 승인한 계정만 본다 (함정 4) | `noSavedCredentialFound`면 `createAccount()`로 넘어간다 |
| **취소는 예외가 아니라 `{ type: 'cancelled' }` 응답**이다 | 카카오(예외 `Cancelled`)와 판정 방식이 다르다 — 응답 타입으로 본다 |
| 토큰의 `aud` = 웹 클라이언트 ID, `azp` = Android 클라이언트 ID | `webClientId`에는 **웹** 클라이언트 ID를 넣는다(Android ID를 넣으면 `DEVELOPER_ERROR`) |
| `signOut()`은 `configure()` 없이 동작한다(Credential Manager 상태만 지움, 소스 확인) | 로그아웃에서 바로 부를 수 있다 |

## 2. 흐름

```
버튼 탭
 ① POST /api/auth/nonce                       → { nonce }
 ② configure({ webClientId, nonce })          (매번)
 ③ signIn() → noSavedCredentialFound면 createAccount()
    cancelled면 조용히 종료(null)
 ④ POST /api/auth/oauth/google { idToken, nonce } → TokenResponse
    INVALID_NONCE면 ①부터 한 번만 자동 재시도
 ⑤ setTokens → GET /api/users/me → setUser
 ⑥ navigation.goBack()                        (카카오와 같다 — §6.7)
```

- **nonce는 버튼 탭 시점에 발급**한다(카카오 §11.1과 같은 이유 — 5분 1회용).
- **자동 재시도는 ①부터 1회.** nonce를 들고 ④만 다시 보내면 반드시 `INVALID_NONCE`다(서버가 검증 전에 소비한다).
  재시도에서는 계정이 이미 승인돼 있어 ③이 바로 성공하는 것이 보통이다. 두 번째도 실패하면 에러로 올린다.
  카카오는 자동 재시도를 하지 않는다 — 이번 범위에서 카카오 동작은 바꾸지 않는다.

## 3. 파일

| 파일 | 내용 |
|---|---|
| `src/constants/google.ts` (신규) | `GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''` — 공개 값(D-5-F) |
| `src/hooks/useAuth.ts` | `useGoogleLogin()` 추가. **`react-native-nitro-google-signin`을 import하는 유일한 파일**(카카오 SDK와 같은 규칙). `useLogout`에 `signOut` 추가 |
| `src/theme/tokens.ts` | 구글 로고·버튼 색 5개(아래 §5) — 공식 고정값 |
| `src/screens/auth/LoginScreen.tsx` | 구글 버튼 + 에러 문구. 카카오와 한 줄에 둔다 |

## 4. 에러

**SDK 에러는 `ApiError(0, 'GOOGLE_SIGN_IN_FAILED', …)`로 바꿔 올린다** — 훅의 에러 타입을 `ApiError` 하나로 유지하기 위해서다.
원래 코드(`DEVELOPER_ERROR` 등)는 `console.warn`으로만 남긴다(사용자에게는 설정 문제를 설명할 수 없다).

| 원인 | 사용자 문구 |
|---|---|
| `EMAIL_ALREADY_REGISTERED` (409) | 이미 가입된 이메일이에요. 기존에 가입한 방법으로 로그인해 주세요 — **카카오와 같은 문구**(백엔드 S-7) |
| `OAUTH_EMAIL_NOT_VERIFIED` (400) | 구글 계정의 이메일 인증 후 다시 시도해 주세요 — D-5-G |
| `OAUTH_EMAIL_NOT_PROVIDED` (400) | 이메일 제공에 동의해야 가입할 수 있습니다 — 카카오와 같은 문구 |
| `INVALID_NONCE` (자동 재시도 후에도) | 서버 메시지 그대로 |
| `GOOGLE_SIGN_IN_FAILED` (SDK) | 구글 로그인에 실패했어요. 잠시 후 다시 시도해 주세요 |
| `GOOGLE_CONFIG_MISSING` (웹 클라이언트 ID 없음) | 구글 로그인 설정에 문제가 있어요 — 빌드 설정 누락이라 개발 중에만 보여야 한다 |
| 그 외 | 서버 메시지 그대로(카카오와 같다) |

**취소는 에러가 아니다** — 훅이 `null`을 돌려주고 화면은 아무것도 띄우지 않는다.

## 5. 버튼

- **라이브러리의 `GoogleSignInButton`은 쓰지 않는다** — Legacy Architecture 클래스(`LayoutShadowNode`)에 의존해 빌드 경고가 난다(D-5-E 1번).
- 구글 브랜딩 가이드라인의 **아이콘 버튼**(원형, 흰 배경 + 테두리 + 4색 "G" 로고)으로 직접 그린다. 카카오 버튼(원형 52px)과 **같은 크기로 나란히** 둔다.
- 로고는 공식 "G" 마크 SVG 경로를 그대로 쓴다(색·비율 변경 금지). 아래 캡션은 가이드라인 문구 **"Google로 계속하기"**.
- 색 토큰(`tokens.ts`, 카카오 색과 같은 취급 — 다른 곳에 섞어 쓰지 않는다):
  `googleBlue #4285F4` · `googleGreen #34A853` · `googleYellow #FBBC05` · `googleRed #EA4335` · `googleButtonBorder #747775`
- 카카오·구글 중 하나라도 진행 중이면 **두 버튼 모두** 비활성화한다(동시에 두 nonce가 나가지 않게).
- 에러 문구 자리는 하나(`socialError`)로 합친다 — 두 줄이 동시에 뜰 일이 없다.

## 6. 로그아웃 · 탈퇴

- **로그아웃(`useLogout`)** — 서버 로그아웃·로컬 정리 뒤에 `signOut()`을 **실패해도 무시하고** 부른다. 다음 로그인에서 계정 선택이 다시 나온다.
  구글로 로그인하지 않은 사용자에게 불러도 무해하다(지울 상태가 없을 뿐) — 로그인 방법을 기억해 두지 않는다.
  세션 만료로 인한 강제 로그아웃(`authStore.logout()` 직접 호출)에서는 부르지 않는다 — 사용자가 고른 행동이 아니고, 남은 상태는 다음 로그인 때 계정 선택이 생략되는 정도다.
- **회원 탈퇴 — 이번 범위가 아니다.** 앱에 탈퇴 기능 자체가 아직 없다(백엔드 Part C C-4 미착수). C-4를 할 때 D-5-G대로:
  탈퇴 **전에** `GET /api/users/me/social-accounts`로 연결 목록을 받아 두고, 서버 삭제 성공 **뒤에** 구글이 있으면 `revokeAccess(email)`, 실패는 무시.
  Android의 `revokeAccess`는 이메일(또는 `sub`)로 계정을 찾는다(소스 확인).

## 7. 검증 (실기기 — ⑥ E2E와 함께)

| # | 확인 | 기대 |
|---|---|---|
| 1 | 새 사용자(개발 DB에 없는 이메일) 구글 로그인 | 가입 + 로그인, 모달 닫힘, 마이페이지에 사용자. **스파이크 4번에서 못 본 신규 가입 성공 경로** |
| 2 | 같은 계정으로 로그아웃 → 다시 로그인 | 로그아웃 뒤 계정 선택이 다시 나온다(`signOut` 동작) · 같은 사용자로 로그인 |
| 3 | 로컬 가입 계정과 같은 이메일의 구글 계정 | `EMAIL_ALREADY_REGISTERED` 문구, 화면 유지 |
| 4 | 계정 선택에서 취소 | 아무 문구 없이 화면 유지 |
| 5 | 카카오 로그인 | 기존과 같다(회귀 없음) |
| 6 | 구글 진행 중 카카오 버튼 | 눌리지 않는다 |

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-11 | **신설.** 백엔드 D-5-G 요약을 앱 코드 단위로 풀었다. 스파이크(D-5-E) 사실 — 취소가 응답 타입으로 온다, `signOut`이 `configure` 없이 동작한다 — 을 전제로 삼았다. 결정: SDK import는 `useAuth.ts` 한 곳(카카오와 같은 규칙), SDK 에러는 `ApiError`로 감싼다, `INVALID_NONCE` 자동 재시도는 구글만 1회(카카오 동작은 이번에 바꾸지 않는다), 라이브러리 버튼 대신 가이드라인 아이콘 버튼을 직접 그린다(Legacy Architecture 경고), 강제 로그아웃에서는 `signOut`을 부르지 않는다, 탈퇴는 앱에 기능이 없어 Part C C-4로 미룬다 |
