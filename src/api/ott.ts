import { api } from './client';
import { EP } from './endpoints';
import type { OttPlatformResponse } from '../types';

export const ottApi = {
  // 비로그인 허용. 활성(is_active) 항목만, 페이징 없음(docs/ott-record-spec.md §0.3).
  platforms: () => api.get<OttPlatformResponse[]>(EP.ott.platforms).then((r) => r.data),
};
