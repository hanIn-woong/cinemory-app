import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ApiError } from '../api/client';
import type { LoginRequest, SignUpRequest, TokenResponse, UserResponse } from '../types';
import { notImplemented } from './_stub';
import { queryKeys } from './queryKeys';

export function useLogin(): UseMutationResult<TokenResponse, ApiError, LoginRequest> {
  return useMutation({ mutationFn: () => notImplemented('useLogin') });
}

export function useSignUp(): UseMutationResult<UserResponse, ApiError, SignUpRequest> {
  return useMutation({ mutationFn: () => notImplemented('useSignUp') });
}

export function useKakaoLogin(): UseMutationResult<TokenResponse, ApiError, void> {
  // 카카오 SDK는 M2-A에서 붙이지 않는다 — prebuild 필요 (docs/M2-frontend-spec.md §11.1).
  return useMutation({ mutationFn: () => notImplemented('useKakaoLogin') });
}

export function useLogout(): UseMutationResult<void, ApiError, void> {
  // M2-B: authApi.logout() 성공/실패와 무관하게 authStore.logout()을 호출한다
  // (docs/M2A-foundation-spec.md §5 규칙 5 — 네트워크가 죽어도 로컬 로그아웃은 되어야 한다).
  return useMutation({ mutationFn: () => notImplemented('useLogout') });
}

export function useMe(): UseQueryResult<UserResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => notImplemented('useMe'),
    enabled: false,
  });
}
