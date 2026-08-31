import { api } from './client';
import { EP } from './endpoints';
import type { UserResponse } from '../types';

export const userApi = {
  me: () => api.get<UserResponse>(EP.users.me).then((r) => r.data),
};
