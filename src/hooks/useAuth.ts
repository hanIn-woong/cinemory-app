import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { userApi } from '../api/user';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest, SignUpRequest, TokenResponse, UserResponse } from '../types';
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

export function useKakaoLogin(): UseMutationResult<TokenResponse, ApiError, void> {
  // 카카오 SDK는 M2-A에서 붙이지 않는다 — prebuild 필요 (docs/M2-frontend-spec.md §11.1). 버튼만 비활성으로 둔다.
  return useMutation({
    mutationFn: () =>
      Promise.reject(new ApiError(0, 'NOT_IMPLEMENTED', '카카오 로그인은 아직 지원하지 않습니다')),
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
