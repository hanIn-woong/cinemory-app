import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ottApi } from '../api/ott';
import type { ApiError } from '../api/client';
import type { OttPlatformResponse } from '../types';
import { queryKeys } from './queryKeys';

// 고정 길이 참조 데이터 — 앱 세션 동안 1회 조회(docs/ott-record-spec.md O-5).
// 비로그인 허용 엔드포인트라 인증 게이팅 불필요.
export function useOttPlatforms(): UseQueryResult<OttPlatformResponse[], ApiError> {
  return useQuery({
    queryKey: queryKeys.ott.platforms(),
    queryFn: ottApi.platforms,
    staleTime: Infinity,
  });
}
