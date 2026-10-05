import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { reportApi } from '../api/report';
import type { ApiError } from '../api/client';
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
