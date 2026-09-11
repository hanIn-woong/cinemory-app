import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login as kakaoSdkLogin } from '@react-native-kakao/user';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { userApi } from '../api/user';
import { KAKAO_NATIVE_APP_KEY } from '../constants/kakao';
import { useAuthStore } from '../store/authStore';
import type {
  LoginRequest,
  PasswordChangeRequest,
  PrivacySetting,
  SignUpRequest,
  TokenResponse,
  UserResponse,
} from '../types';
import { queryKeys } from './queryKeys';

export function useLogin(): UseMutationResult<TokenResponse, ApiError, LoginRequest> {
  return useMutation({
    mutationFn: (body) => authApi.login(body),
    onSuccess: async (data) => {
      // login은 사용자 정보를 주지 않는다 — 토큰 저장 후 별도로 조회한다 (docs/M2B-screens-spec.md §5.1)
      await useAuthStore.getState().setTokens(data);
      const me = await userApi.me();
      useAuthStore.getState().setUser(me);
    },
  });
}

export function useSignUp(): UseMutationResult<UserResponse, ApiError, SignUpRequest> {
  return useMutation({ mutationFn: (body) => authApi.signUp(body) });
}

// 카카오 로그인 취소 — 에러가 아니라 조용한 복귀로 처리한다 (docs/M2-frontend-spec.md §11.1).
export class KakaoLoginCancelledError extends Error {}

// SDK 초기화는 부팅 시퀀스에 합류시키지 않는다 — App.tsx의 restore()+스플래시는 건드리지
// 않고, 버튼 탭 시점에 모듈 레벨 가드로 한 번만 부른다(§11.1 "코드가 닿는 곳").
let kakaoSdkInitialized = false;
function ensureKakaoSdkInitialized() {
  if (kakaoSdkInitialized) return;
  initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);
  kakaoSdkInitialized = true;
}

// ② 카카오 SDK 호출 — @react-native-kakao/* 를 import하는 유일한 지점.
// 취소 판정("Cancelled" 코드, 공식 Android SDK의 ClientErrorCause)은 실기기로 확인됨
// (docs/M2-frontend-spec.md §11.1 검증 3번, 2026-09-11).
async function kakaoNativeLogin(nonce: string): Promise<{ idToken?: string }> {
  ensureKakaoSdkInitialized();
  try {
    const result = await kakaoSdkLogin({ nonce });
    return { idToken: result.idToken };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'Cancelled') {
      throw new KakaoLoginCancelledError();
    }
    throw err;
  }
}

export function useKakaoLogin(): UseMutationResult<TokenResponse | null, ApiError, void> {
  return useMutation({
    mutationFn: async () => {
      // ① nonce는 버튼 탭 시점에 발급한다 — 5분 1회용이라 화면 진입 시점에 미리 받아두지
      // 않는다(§11.1). 실패 후 재시도도 mutate()를 다시 호출하는 것만으로 매번 여기서부터
      // 다시 타 — nonce를 들고 있다가 ②만 재시도하면 반드시 INVALID_NONCE다.
      const { nonce } = await authApi.nonce();
      if (!nonce) throw new ApiError(0, 'INVALID_NONCE', 'nonce 발급에 실패했습니다');

      let result: { idToken?: string };
      try {
        result = await kakaoNativeLogin(nonce);
      } catch (error) {
        // 사용자가 로그인을 취소한 경우는 에러가 아니다 — 토스트 없이 조용히 복귀시킨다.
        if (error instanceof KakaoLoginCancelledError) return null;
        throw error;
      }

      // ③ idToken은 optional이다 — 카카오 콘솔의 OpenID Connect가 꺼져 있으면 에러가 아니라
      // *필드가 없는* 형태로 온다. 여기서 명시적으로 가드하지 않으면 알아채기 어렵다.
      if (!result.idToken) {
        throw new ApiError(
          0,
          'KAKAO_OIDC_DISABLED',
          '카카오 로그인 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요',
        );
      }

      // ④ 서버 검증(서명·iss·aud·nonce) → ⑤ 토큰 저장 + 사용자 조회
      const tokens = await authApi.oauthLogin('kakao', { idToken: result.idToken, nonce });
      await useAuthStore.getState().setTokens(tokens);
      const me = await userApi.me();
      useAuthStore.getState().setUser(me);
      return tokens;
    },
  });
}

export function useLogout(): UseMutationResult<void, ApiError, void> {
  return useMutation({
    mutationFn: async () => {
      // 네트워크가 죽어도 로컬 로그아웃은 되어야 한다 — 성공/실패와 무관하게 authStore.logout()
      // (docs/M2A-foundation-spec.md §5 규칙 5).
      const refreshToken = await useAuthStore.getState().getRefreshToken();
      try {
        if (refreshToken) await authApi.logout(refreshToken);
      } finally {
        await useAuthStore.getState().logout();
      }
    },
  });
}

export function useMe(): UseQueryResult<UserResponse, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => userApi.me(),
    enabled: isAuthed,
  });
}

export function useUpdateNickname(): UseMutationResult<UserResponse, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nickname) => userApi.updateNickname({ nickname }),
    onSuccess: (data) => {
      // 프로필 수정 → ['users','me'] 무효화 (§3.2 무효화 매트릭스)
      useAuthStore.getState().setUser(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}

export function useUpdatePrivacy(): UseMutationResult<UserResponse, ApiError, PrivacySetting> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (privacySetting) => userApi.updatePrivacy({ privacySetting }),
    onSuccess: (data) => {
      useAuthStore.getState().setUser(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}

export function useChangePassword(): UseMutationResult<void, ApiError, PasswordChangeRequest> {
  return useMutation({
    mutationFn: (body) => userApi.changePassword(body),
    // ⚠️ 성공 시 서버가 전 세션을 폐기한다 — 저장된 토큰을 버리고 로그인 화면으로 보낸다
    // (docs/M2B-screens-spec.md §5.6). 안 그러면 다음 재발급이 반드시 실패한다.
    onSuccess: () => useAuthStore.getState().logout(),
  });
}
