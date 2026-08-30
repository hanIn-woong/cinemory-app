import { api } from './client';
import { EP } from './endpoints';
import type {
  LoginRequest,
  NonceResponse,
  OAuthLoginRequest,
  SignUpRequest,
  TokenResponse,
  UserResponse,
} from '../types';

export const authApi = {
  signUp: (body: SignUpRequest) => api.post<UserResponse>(EP.auth.signup, body).then((r) => r.data),

  login: (body: LoginRequest) => api.post<TokenResponse>(EP.auth.login, body).then((r) => r.data),

  nonce: () => api.post<NonceResponse>(EP.auth.nonce).then((r) => r.data),

  oauthLogin: (provider: string, body: OAuthLoginRequest) =>
    api.post<TokenResponse>(EP.auth.oauth(provider), body).then((r) => r.data),

  logout: (refreshToken: string) => api.post<void>(EP.auth.logout, { refreshToken }).then((r) => r.data),
};
