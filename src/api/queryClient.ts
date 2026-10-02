import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        const s = (err as unknown as ApiError)?.status;
        // 5xx·네트워크(0)·요청 제한(429)만 재시도 — 4xx는 다시 보내도 같다(docs/token-refresh-resilience-spec.md R-7).
        // mutation에는 넣지 않는다 — 쓰기를 자동 재전송하면 중복 생성될 수 있다.
        return (s === 0 || s === 429 || s >= 500) && count < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
