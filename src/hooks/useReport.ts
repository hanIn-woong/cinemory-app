import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { reportApi } from '../api/report';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { ReportCalendarResponse, ReportMonthlyResponse, ReportStatisticsResponse } from '../types';
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
