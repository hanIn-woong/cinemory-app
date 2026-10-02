import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { TokenResponse } from '../types';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

// Error를 상속한다 — plain object를 throw하면 스택 추적이 사라지고
// instanceof Error 검사가 실패해 에러 바운더리·로깅 품질이 떨어진다 (§4.2).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: { field: string; reason: string }[] = [],
    readonly isNetwork = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorResponseBody {
  status?: number;
  code?: string;
  message?: string;
  errors?: { field: string; reason: string }[];
}

// 앱 전역. 인증 인터셉터가 붙는다.
export const api = axios.create({ baseURL: BASE_URL });
// 재발급 전용. 인터셉터 없음 — reissue의 401이 인터셉터를 재귀적으로 깨우는 것을 막는다.
const bare = axios.create({ baseURL: BASE_URL });

const AUTH_PATH_PREFIX = '/api/auth/';

// 토큰/세션 자체가 무효하다는 뜻인 코드만 강제 로그아웃 대상이다(docs/M2-frontend-spec.md §6.3
// 에러 코드 표). `UNAUTHORIZED`는 표에 없지만 viewerId가 null인 이중 방어 코드에서만 나오고
// (backend `requireAuthenticated`), 정상적으로는 SecurityFilterChain이 먼저 막아 여기 도달하지
// 않는 케이스라 토큰 문제로 취급한다. ⚠️ `INVALID_CREDENTIALS`처럼 **인증된 요청 안에서
// 입력값(예: 현재 비밀번호 불일치)이 틀려서 401을 반환하는 비즈니스 코드**를 여기 넣으면
// 안 된다 — 세션은 멀쩡한데 강제 로그아웃돼 버린다(2026-09-05, 비밀번호 변경 §5.6 실기기
// 검증에서 발견).
const SESSION_INVALID_CODES = new Set(['INVALID_TOKEN', 'REFRESH_TOKEN_NOT_FOUND', 'REFRESH_TOKEN_REUSED', 'UNAUTHORIZED']);

// ★ 단일 비행(single-flight) 재발급 — 동시 401이 각자 reissue를 호출하면
// 리프레시 회전 + 재사용 감지에 걸려 전 세션이 폐기된다 (docs/M2-frontend-spec.md §6.3).
let refreshPromise: Promise<string> | null = null;

function refreshOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const rt = await useAuthStore.getState().getRefreshToken();
      if (!rt) throw new Error('NO_REFRESH_TOKEN');
      const { data } = await bare.post<TokenResponse>(AUTH_PATH_PREFIX + 'reissue', { refreshToken: rt });
      await useAuthStore.getState().setTokens(data); // ★ 회전된 refreshToken도 반드시 저장
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null; // 성공·실패 모두 되돌린다
    });
  }
  return refreshPromise;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (config.url?.startsWith(AUTH_PATH_PREFIX)) return config;

  const { accessToken, accessTokenExpiresAt } = useAuthStore.getState();
  if (accessToken && accessTokenExpiresAt - Date.now() < 60_000) {
    // 만료 60초 전 선제 갱신. 세션 사망이면 즉시 로그아웃하고 여기서 멈춘다 —
    // 토큰 없이 그냥 보내면 401을 한 번 더 받을 뿐이다 (§4.2).
    try {
      await refreshOnce();
    } catch (e) {
      if (isSessionDead(e)) {
        await useAuthStore.getState().logout();
        throw toApiError(e);
      }
      // 일시적 실패 — 세션 유지. 현재 토큰으로 그대로 보낸다. 이미 만료됐다면 서버의 401 TOKEN_EXPIRED를
      // 응답 인터셉터가 받아 한 번 더 재발급을 시도한다(docs/token-refresh-resilience-spec.md R-5).
    }
  }

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(undefined, async (error: AxiosError<ErrorResponseBody>) => {
  // 요청 인터셉터가 던진 ApiError도 여기로 온다(axios는 요청 인터셉터의 거부를 응답 인터셉터로 흘린다).
  // response가 없어 normalizeError가 NETWORK_ERROR로 덮어쓰므로 그대로 통과시킨다.
  if (error instanceof ApiError) throw error;

  const { response, config } = error;

  if (!config || response?.status !== 401 || config._retried) {
    throw normalizeError(error);
  }
  if (config.url?.startsWith(AUTH_PATH_PREFIX)) {
    throw normalizeError(error);
  }

  // 게스트 가드 — 게스트는 토큰이 없어 인증 필요 API에서 401을 받는다. 세션이 없으니
  // refresh·logout은 낭비다 (docs/M2-frontend-spec.md §6.7). 애초에 훅의 enabled가
  // 게스트의 인증 API 호출을 막지만, 빠뜨렸을 때를 위한 이중 방어다.
  if (useAuthStore.getState().status !== 'authenticated') {
    throw normalizeError(error);
  }

  const code = response.data?.code;
  if (code !== 'TOKEN_EXPIRED') {
    if (SESSION_INVALID_CODES.has(code ?? '')) {
      await useAuthStore.getState().logout();
    }
    // 그 외 코드(예: INVALID_CREDENTIALS)는 세션과 무관한 비즈니스 401이다 — 인터셉터가
    // 개입하지 않고 호출부의 에러 처리로 그대로 넘긴다(§6.3 에러 코드 표).
    throw normalizeError(error);
  }

  try {
    const token = await refreshOnce();
    config._retried = true; // 원 요청 재시도는 1회만
    config.headers.Authorization = `Bearer ${token}`;
    // await 하지 않는다 — 재시도 요청 자체의 실패는 재발급 실패가 아니므로 아래 catch로 들어오면 안 된다.
    return api.request(config);
  } catch (e) {
    if (isSessionDead(e)) {
      await useAuthStore.getState().logout();
      throw normalizeError(error); // 세션 사망 — 원래의 401을 그대로
    }
    throw toApiError(e); // 일시적 실패 — 원인 에러(네트워크·503…)를 던진다, 세션 유지 (R-4)
  }
});

function normalizeError(error: AxiosError<ErrorResponseBody>): ApiError {
  if (!error.response) {
    return new ApiError(0, 'NETWORK_ERROR', error.message, [], true);
  }
  const { status, data } = error.response;
  return new ApiError(status, data?.code ?? 'UNKNOWN_ERROR', data?.message ?? error.message, data?.errors ?? []);
}

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
