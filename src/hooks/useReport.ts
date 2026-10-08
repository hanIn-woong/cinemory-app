import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { reportApi } from '../api/report';
import type { ApiError } from '../api/client';
import { PosterSize, tmdbImageUrl } from '../constants/tmdb';
import { useAuthStore } from '../store/authStore';
import type {
  ReportCalendarResponse,
  ReportMonthlyResponse,
  ReportStatisticsResponse,
  ReportYearlyResponse,
} from '../types';
import { queryKeys } from './queryKeys';

export function useReportStatistics(userId?: number): UseQueryResult<ReportStatisticsResponse, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.report.statistics(userId!),
    queryFn: () => reportApi.statistics(userId!),
    enabled: isAuthed && userId != null,
  });
}

export function useMonthlyReport(
  userId: number | undefined,
  year: number,
  month: number,
): UseQueryResult<ReportMonthlyResponse, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.report.monthly(userId!, year, month),
    queryFn: () => reportApi.monthly(userId!, year, month),
    enabled: isAuthed && userId != null,
  });
}

export function useCalendar(
  userId: number | undefined,
  year: number,
  month: number,
): UseQueryResult<ReportCalendarResponse, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.report.calendar(userId!, year, month),
    queryFn: () => reportApi.calendar(userId!, year, month),
    enabled: isAuthed && userId != null,
  });
}

// 캘린더 앞뒤 달 미리 받기 — 처음 보는 달로 넘기면 데이터 왕복 + 포스터 최대 31장을 그때부터 받아서
// 칸이 늦게 찼다(2026-10-08 실기기). 지금 달이 뜬 뒤(enabled) 이전·다음 달 데이터를 캐시에 넣고, 그 달
// 칸에 쓸 포스터(FullDayCell과 같은 "그날 마지막 기록" · SHELF — URL이 같아야 캐시가 맞는다)를 선요청한다.
// ⚠️ Image.prefetch는 취소되지 않는다 — 무한스크롤 리스트에서 철회한 이유(docs/M2-frontend-spec.md 09-26).
// 여기는 한 번에 최대 62장이고 달을 넘길 때만 생겨 쌓이지 않는다. 이미 받은 포스터는 디스크 캐시라 비용이 거의 없다.
// cachePolicy 'disk' — 'memory-disk'면 받자마자 비트맵으로 디코드해 메모리에 올리는데, 그 작업이 슬라이드와
// 겹쳐 스와이프가 나빠졌다(2026-10-08 실기기). 디스크까지만 받아 두고 디코드는 칸이 그려질 때 한다.
// enabled는 호출 측이 "지금 달 로드 완료 + 슬라이드 종료"로 건다(CalendarScreen).
export function useCalendarNeighborPrefetch(userId: number | undefined, year: number, month: number, enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || userId == null) return;
    let cancelled = false;
    // 이전 달 먼저 — 오늘이 기본 화면이라 지나간 달로 가는 경우가 많고, 다음 달은 대개 비어 있다.
    for (const delta of [-1, 1]) {
      const target = new Date(year, month - 1 + delta, 1);
      const y = target.getFullYear();
      const m = target.getMonth() + 1;
      // fetchQuery는 캐시가 신선하면(staleTime) 요청하지 않고 그대로 돌려준다.
      queryClient
        .fetchQuery({ queryKey: queryKeys.report.calendar(userId, y, m), queryFn: () => reportApi.calendar(userId, y, m) })
        .then((data) => {
          if (cancelled) return;
          const urls = (data.days ?? [])
            .map((day) => tmdbImageUrl(day.records?.[day.records.length - 1]?.posterPath, PosterSize.SHELF))
            .filter((url): url is string => url != null);
          if (urls.length > 0) Image.prefetch(urls, { cachePolicy: 'disk' });
        })
        .catch(() => {
          // 미리 받기 실패는 무시 — 그 달로 넘어가면 useCalendar가 다시 요청하고 에러도 거기서 보인다.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [queryClient, userId, year, month, enabled]);
}

// 연간 리포트 — ⚠️ enabled로 지연 로딩한다. 연간 탭을 처음 누를 때만 요청하고(집계 쿼리 11개를 월간만 보는
// 사용자에게 돌리지 않는다), 한 번 받은 뒤에는 캐시라 탭을 왕복해도 재요청이 없다(docs/M2C2-report-spec.md §9.3).
export function useYearlyReport(
  userId: number | undefined,
  year: number,
  enabled: boolean,
): UseQueryResult<ReportYearlyResponse, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.report.yearly(userId!, year),
    queryFn: () => reportApi.yearly(userId!, year),
    enabled: enabled && isAuthed && userId != null,
  });
}
