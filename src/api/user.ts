import { api } from './client';
import { EP } from './endpoints';
import type {
  NicknameChangeRequest,
  PasswordChangeRequest,
  PrivacyChangeRequest,
  UserResponse,
} from '../types';

export const userApi = {
  me: () => api.get<UserResponse>(EP.users.me).then((r) => r.data),

  updateNickname: (body: NicknameChangeRequest) =>
    api.patch<UserResponse>(EP.users.nickname, body).then((r) => r.data),

  updatePrivacy: (body: PrivacyChangeRequest) =>
    api.patch<UserResponse>(EP.users.privacy, body).then((r) => r.data),

  // 204 성공 시 서버가 전 세션을 폐기한다(docs/M2B-screens-spec.md §5.6) — 호출부가 로그아웃 처리한다.
  changePassword: (body: PasswordChangeRequest) => api.patch<void>(EP.users.password, body).then((r) => r.data),
};
