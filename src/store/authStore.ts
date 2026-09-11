import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { queryClient } from '../api/queryClient';
import type { TokenResponse, UserResponse } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

const KEYS = {
  accessToken: 'cinemory.accessToken',
  refreshToken: 'cinemory.refreshToken',
  user: 'cinemory.user',
  accessTokenExpiresAt: 'cinemory.accessTokenExpiresAt',
} as const;

interface AuthState {
  status: AuthStatus;
  user: UserResponse | null;
  accessToken: string | null;
  accessTokenExpiresAt: number; // epoch ms

  restore(): Promise<void>;
  setTokens(t: TokenResponse): Promise<void>;
  setUser(u: UserResponse): void;
  getRefreshToken(): Promise<string | null>;
  logout(): Promise<void>;
}

// 상태와 SecureStore 영속화만 담당한다. API를 호출하지 않는다
// (docs/M2A-foundation-spec.md §5 — 순환 방지: authStore ──► expo-secure-store 만).
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  accessTokenExpiresAt: 0,

  async restore() {
    // JSON.parse나 SecureStore 호출이 던지면 status가 'loading'에 갇혀 앱이
    // 스플래시에서 영구 정지한다 (§5 규칙 5) — 전체를 try/catch로 감싼다.
    try {
      const [accessToken, refreshToken, userJson, expiresAtRaw] = await Promise.all([
        SecureStore.getItemAsync(KEYS.accessToken),
        SecureStore.getItemAsync(KEYS.refreshToken),
        SecureStore.getItemAsync(KEYS.user),
        SecureStore.getItemAsync(KEYS.accessTokenExpiresAt),
      ]);

      if (accessToken && refreshToken) {
        // 값이 없거나(이전 버전에서 이관) 파싱 실패면 0 — 콜드 스타트마다 client.ts의 선제
        // 갱신이 걸려 리프레시 토큰까지 함께 검증되던 현행 동작으로 안전하게 폴백된다(§7.5).
        const parsed = expiresAtRaw ? Number(expiresAtRaw) : NaN;
        const accessTokenExpiresAt = Number.isFinite(parsed) ? parsed : 0;
        set({
          status: 'authenticated',
          accessToken,
          accessTokenExpiresAt,
          user: userJson ? (JSON.parse(userJson) as UserResponse) : null,
        });
      } else {
        set({ status: 'anonymous' });
      }
    } catch {
      // 삭제 자체가 던져도(키스토어가 깨진 경우) set()이 실행되지 않으면
      // status가 'loading'에 갇힌다 — 삭제 실패를 흡수해 아래 set()을 항상 보장한다.
      try {
        await Promise.all([
          SecureStore.deleteItemAsync(KEYS.accessToken),
          SecureStore.deleteItemAsync(KEYS.refreshToken),
          SecureStore.deleteItemAsync(KEYS.user),
          SecureStore.deleteItemAsync(KEYS.accessTokenExpiresAt),
        ]);
      } catch {}
      set({ status: 'anonymous', user: null, accessToken: null, accessTokenExpiresAt: 0 });
    }
  },

  async setTokens(t) {
    const accessTokenExpiresAt = Date.now() + t.accessTokenExpiresIn * 1000;
    await Promise.all([
      SecureStore.setItemAsync(KEYS.accessToken, t.accessToken),
      SecureStore.setItemAsync(KEYS.refreshToken, t.refreshToken),
      SecureStore.setItemAsync(KEYS.accessTokenExpiresAt, String(accessTokenExpiresAt)),
    ]);
    set({ status: 'authenticated', accessToken: t.accessToken, accessTokenExpiresAt });
  },

  setUser(u) {
    set({ user: u });
    void SecureStore.setItemAsync(KEYS.user, JSON.stringify(u));
  },

  getRefreshToken() {
    return SecureStore.getItemAsync(KEYS.refreshToken);
  },

  async logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
      SecureStore.deleteItemAsync(KEYS.user),
      SecureStore.deleteItemAsync(KEYS.accessTokenExpiresAt),
    ]);
    set({ status: 'anonymous', user: null, accessToken: null, accessTokenExpiresAt: 0 });
    queryClient.clear();
  },
}));
