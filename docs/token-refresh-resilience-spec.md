# CineMory — 토큰 재발급 실패 처리 정정 스펙

> 상위 문서: `docs/M2-frontend-spec.md` §6.3·§6.4 — **계약과 사실은 그쪽, 실행과 검증은 여기**
> 대상: `cinemory-app` — **JS 전용, 재빌드 불필요** (`src/api/client.ts`, `src/api/queryClient.ts`)
> 시점: **실서버 배포 Phase 5(실기기 E2E) 전에 끝낸다** — 백엔드 `docs/deploy-spec.md`
>
> 발견 경위(2026-10-02): 배포 Phase 2의 Nginx 요청 제한(L-1)을 검토하다, `reissue`가 429를 받으면 앱이 **강제 로그아웃**한다는
> 것을 확인했다. 요청 제한은 `reissue`를 대상에서 빼는 것으로 정리했지만, 원인은 앱 쪽에 더 넓게 있었다.

---

## 0. 문제

### 0.1 지금 동작 — 재발급이 *어떤 이유로든* 실패하면 로그아웃

`client.ts`의 두 경로가 모두 그렇다.

| 경로 | 코드 | 실패 시 |
|---|---|---|
| 선제 갱신 (요청 인터셉터, 만료 60초 전) | `try { await refreshOnce() } catch { logout() }` | 즉시 로그아웃 |
| 401 `TOKEN_EXPIRED` 처리 (응답 인터셉터) | `try { refreshOnce(); 재시도 } catch { logout() }` | 즉시 로그아웃 |

`refreshOnce()`가 실패하는 이유에는 **세션이 실제로 죽은 경우**와 **잠깐 통신이 안 된 경우**가 섞여 있는데, 둘을 구분하지 않는다.

### 0.2 실서버에서 실제로 일어날 상황

| 상황 | 재발급 응답 | 지금 | 맞는 동작 |
|---|---|---|---|
| **CI 배포 중 앱 재시작**(deploy-spec Phase 4 — 수십 초) | Nginx **502** | **접속해 있던 모든 사용자가 로그아웃** | 유지, 잠시 후 재시도 |
| 지하철·엘리베이터 등 LTE 음영 | 응답 없음(네트워크 오류) | 로그아웃 | 유지 |
| **오프라인 상태로 앱 콜드 스타트** | 네트워크 오류 | 로그아웃 — `restore()`가 만료 시각 0으로 폴백하면 첫 요청이 곧 선제 갱신이다(§6.4) | 유지 |
| 요청 제한·서버 과부하 | 429 · 503 | 로그아웃 | 유지 |
| 리프레시 토큰 만료(14일) · 재사용 감지 · DB에 없음 | **401** `TOKEN_EXPIRED` · `REFRESH_TOKEN_REUSED` · `REFRESH_TOKEN_NOT_FOUND` | 로그아웃 | **로그아웃 (맞음)** |

**첫 줄이 가장 심각하다** — 배포할 때마다 전원이 로그아웃되면 *"배포가 안전하다"* 는 말이 성립하지 않는다.

### 0.3 부수 문제 — 사용자에게 엉뚱한 메시지

401 경로에서 재발급이 실패하면 **원래 요청의 401(`TOKEN_EXPIRED`, "토큰이 만료되었습니다")** 을 던진다. 실제 원인이 네트워크여도
"토큰 만료"로 보인다.

---

## 1. 결정

| # | 결정 | 이유 |
|---|---|---|
| R-1 | **재발급 실패를 둘로 나눈다** — **세션 사망**이면 로그아웃, **일시적 실패**면 세션 유지 | 0.2 |
| R-2 | **세션 사망 판정 = 재발급 응답이 `400` 또는 `401`**, 또는 저장된 리프레시 토큰이 없음(`NO_REFRESH_TOKEN`) | 백엔드 `AuthService.reissue`가 세션 문제를 내는 코드는 전부 401(`REFRESH_TOKEN_NOT_FOUND`·`TOKEN_EXPIRED`·`REFRESH_TOKEN_REUSED`)이고, 400은 요청 자체가 잘못된 경우(토큰 형식)라 재시도해도 바뀌지 않는다. **응답 없음·429·5xx는 전부 일시적**으로 본다 |
| R-3 | ⚠️ 판정은 **상태 코드로** 한다(에러 코드 목록이 아니라) | 재발급 엔드포인트의 `TOKEN_EXPIRED`는 *리프레시 토큰 만료*라 세션 사망인데, 일반 API의 `TOKEN_EXPIRED`는 *재발급하라*는 뜻이다. **같은 코드가 경로에 따라 정반대**라 코드 목록으로 판정하면 틀린다 |
| R-4 | 일시적 실패 시 **원 요청은 실패시키되, 그 원인 에러를 던진다**(네트워크 오류면 `NETWORK_ERROR`, 503이면 503) | 0.3 — 사용자가 "연결을 확인해 주세요"를 보게 한다 |
| R-5 | 선제 갱신의 일시적 실패는 **현재 토큰으로 요청을 그대로 보낸다** | 선제 갱신은 만료 **60초 전**에 걸리므로 현재 토큰이 아직 유효할 수 있다. 이미 만료됐다면 서버가 401 `TOKEN_EXPIRED`를 주고, 응답 인터셉터가 한 번 더 재발급을 시도한다 — 별도 분기가 필요 없다 |
| R-6 | **자동 재시도 루프를 새로 만들지 않는다** | 쿼리는 TanStack Query 재시도가 이미 있다(R-7). 인터셉터 안에서 백오프 루프를 돌리면 단일 비행(`refreshOnce`)과 얽혀 복잡해진다 |
| R-7 | 쿼리 재시도 조건에 **`status === 0`(네트워크)과 `429`를 추가** | 지금은 `>= 500`만 재시도한다. 일시적 실패로 남은 쿼리가 스스로 회복하게 |

### 범위 밖 — 알고 남기는 것

- **응답 유실로 인한 재사용 감지** — 서버가 회전을 커밋했는데 응답이 네트워크에서 사라지면, 앱은 옛 리프레시 토큰을 들고 있다.
  다음 재발급이 **30초 유예 안**이면 통과하지만 그 뒤면 `REFRESH_TOKEN_REUSED`로 전 세션이 끊긴다(security-spec **L-4**).
  이번 정정은 *일시적 실패 = 유지*라 이 경우가 **조금 더 자주 노출**될 수 있다. 서버가 토큰 원문을 저장하지 않아 클라이언트로는 막을
  수 없고, 결과는 **재로그인 1회**(데이터 손실 없음)라 수용한다.

---

## 2. 파일 단위 지시

### 2-1. `src/api/client.ts`

**① 판정 함수 추가** (`normalizeError` 근처)

```ts
// 재발급 실패가 "세션이 죽었다"는 뜻인지. 상태 코드로 판정한다(R-3) — 재발급 경로의 TOKEN_EXPIRED는
// "리프레시 토큰 만료"(세션 사망)이고, 일반 API의 TOKEN_EXPIRED는 "재발급하라"(정상 흐름)다.
// 응답 없음(네트워크)·429·5xx는 일시적 실패 — 세션을 유지한다(docs/token-refresh-resilience-spec.md).
function isSessionDead(e: unknown): boolean {
  if (e instanceof Error && e.message === 'NO_REFRESH_TOKEN') return true;
  if (axios.isAxiosError(e) && e.response) {
    const s = e.response.status;
    return s === 400 || s === 401;
  }
  return false;
}

// 재발급 실패를 호출부에 던질 ApiError로 — 일시적 실패면 그 원인(네트워크·503 등)이 보이게 한다(R-4).
function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (axios.isAxiosError(e)) return normalizeError(e as AxiosError<ErrorResponseBody>);
  return new ApiError(0, 'UNKNOWN_ERROR', e instanceof Error ? e.message : String(e));
}
```

**② 요청 인터셉터 — 선제 갱신** (R-5)

```ts
if (accessToken && accessTokenExpiresAt - Date.now() < 60_000) {
  try {
    await refreshOnce();
  } catch (e) {
    if (isSessionDead(e)) {
      await useAuthStore.getState().logout();
      throw toApiError(e);
    }
    // 일시적 실패 — 세션 유지. 현재 토큰으로 그대로 보낸다. 이미 만료됐다면 서버의 401 TOKEN_EXPIRED를
    // 응답 인터셉터가 받아 한 번 더 재발급을 시도한다.
  }
}
```

- 기존 주석 *"실패하면 즉시 로그아웃하고 여기서 멈춘다 — 토큰 없이 그냥 보내면 401을 한 번 더 받을 뿐이다(§4.2)"* 는
  **세션 사망에만** 해당하도록 고친다.

**③ 응답 인터셉터 — 401 `TOKEN_EXPIRED` 처리** (R-1·R-4)

```ts
try {
  const token = await refreshOnce();
  config._retried = true;
  config.headers.Authorization = `Bearer ${token}`;
  return api.request(config);
} catch (e) {
  if (isSessionDead(e)) {
    await useAuthStore.getState().logout();
    throw normalizeError(error);      // 세션 사망 — 원래의 401을 그대로(기존 동작)
  }
  throw toApiError(e);                // 일시적 실패 — 원인 에러(네트워크·503…)를 던진다, 세션 유지
}
```

- ⚠️ **`api.request(config)`(재시도 요청) 자체의 실패는 이 `catch`에 들어오지 않게** 구조를 유지한다 — 재시도 요청이 실패한 것은
  재발급 실패가 아니다. 지금 코드처럼 `return api.request(config)`를 `try` 안에 두면, 재시도의 **동기 예외만** 잡히고 반환된 Promise의
  거부는 바깥으로 나가므로 현재 구조로 충분하다. `await`를 붙이지 말 것.
- `refreshOnce()`·`SESSION_INVALID_CODES`·단일 비행 구조는 **그대로** 둔다. `SESSION_INVALID_CODES`는 *일반 API 응답*의 401 코드
  판정용이라 이번 변경과 층이 다르다.

**④ 응답 인터셉터 맨 앞 — 요청 인터셉터의 `ApiError` 통과** (구현 중 추가, R-4 보완)

```ts
if (error instanceof ApiError) throw error;
```

- axios(1.20)는 **요청 인터셉터의 거부를 응답 인터셉터의 `onRejected`로 흘린다**(`promise.then(dispatchRequest, undefined)` 다음에
  응답 체인). ②의 세션 사망 분기가 던진 `ApiError`는 `response`·`config`가 없어 `normalizeError`가 **`NETWORK_ERROR`로 덮어쓴다** —
  그대로 통과시킨다.

### 2-2. `src/api/queryClient.ts` (R-7)

```ts
retry: (count, err) => {
  const s = (err as unknown as ApiError)?.status;
  // 5xx·네트워크(0)·요청 제한(429)만 재시도 — 4xx는 다시 보내도 같다.
  return (s === 0 || s === 429 || s >= 500) && count < 2;
},
```

- `retryDelay`는 기본값(지수 백오프)을 쓴다 — CI 배포 재시작(수십 초) 동안의 실패를 1~2회 흡수한다.
- **mutation에는 재시도를 추가하지 않는다** — 기록 저장 같은 쓰기를 자동으로 다시 보내면 중복 생성될 수 있다.

### 2-3. 문서

- `docs/M2-frontend-spec.md` §6.3 에러 코드 표 아래에 한 줄 — *"재발급 **자체**의 실패는 코드가 아니라 상태 코드로 판정한다
  (400·401만 로그아웃) — `docs/token-refresh-resilience-spec.md`"*. (이 문서와 함께 반영됨)

---

## 3. 검증

> 로컬에서 재현하려면 백엔드 `application.yml`의 `jwt.access-token-ttl`을 **잠시 `PT2M`** 으로 줄이면 편하다(검증 후 원복).

| # | 시나리오 | 방법 | 기대 |
|---|---|---|---|
| 1 | **배포 중 재시작** | 로그인 → 토큰 만료 직전에 **백엔드 중지** → 화면 이동 | 로그아웃 **안 됨**, 네트워크 오류 표시. 백엔드 재기동 후 당겨서 새로고침 → 정상 |
| 2 | 비행기 모드 | 로그인 → 만료 직전 비행기 모드 → 화면 이동 → 해제 | 1과 같음 |
| 3 | **오프라인 콜드 스타트** | 로그인 상태로 앱 종료 → 비행기 모드로 앱 실행 | 로그인 상태 유지(로그인 화면으로 튕기지 않음) |
| 4 | 리프레시 토큰 무효 | DB에서 해당 `refresh_token` 행 삭제 → 만료 후 화면 이동 | **로그아웃**(`REFRESH_TOKEN_NOT_FOUND`) |
| 5 | 재사용 감지 | (기존 §6.3 검증과 동일) | **로그아웃** |
| 6 | 동시 401 | 만료 후 여러 쿼리가 동시에 도는 화면 진입 | 재발급 **1회**(단일 비행 유지), 로그아웃 없음 |
| 7 | 비밀번호 변경 시 현재 비밀번호 오류 | 설정 → 비밀번호 변경 | `INVALID_CREDENTIALS` 폼 표시, **로그아웃 안 됨**(기존 동작 유지) |

`npx tsc --noEmit` 통과.

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-02 (구현) | **§2-1·§2-2 구현 완료 — 실기기 §3 검증 전.** 스펙대로 반영하면서 **§2-1 ④를 추가**했다: axios는 요청 인터셉터가 던진 에러도 응답 인터셉터의 `onRejected`로 보내는데, 거기서 `normalizeError`가 `response` 없는 `ApiError`를 `NETWORK_ERROR`로 바꿔 버린다(기존 코드에도 있던 문제 — 선제 갱신의 로그아웃 경로가 늘 "네트워크 오류"로 보였다). 응답 인터셉터 맨 앞에서 `ApiError`면 그대로 다시 던진다. `npx tsc --noEmit` 통과 |
| 2026-10-02 | **신설.** 배포 Phase 2의 Nginx 요청 제한을 검토하다 `reissue` 429가 강제 로그아웃으로 이어지는 것을 발견했고, 원인이 앱의 재발급 실패 처리에 있었다 — **세션 사망과 일시적 통신 실패를 구분하지 않고 모두 로그아웃**한다. 실서버에서는 **CI 배포의 앱 재시작(Nginx 502)마다 접속 중인 전원이 로그아웃**되는 문제가 된다. 판정을 **재발급 응답의 상태 코드(400·401만 사망)** 로 바꾼다 — 에러 코드로 판정하면 안 되는 이유는 재발급 경로의 `TOKEN_EXPIRED`(리프레시 만료=사망)와 일반 API의 `TOKEN_EXPIRED`(재발급하라)가 같은 코드로 정반대 뜻이기 때문이다. 함께 쿼리 재시도에 네트워크(0)·429를 추가. 응답 유실 시의 재사용 감지(L-4)가 조금 더 노출되는 점은 재로그인 1회로 끝나 수용 |
