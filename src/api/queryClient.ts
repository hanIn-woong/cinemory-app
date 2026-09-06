import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => (err as unknown as ApiError)?.status >= 500 && count < 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
