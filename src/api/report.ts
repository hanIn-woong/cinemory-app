import { api } from './client';
import { EP } from './endpoints';
import type { ReportCalendarResponse, ReportMonthlyResponse, ReportStatisticsResponse } from '../types';

export const reportApi = {
  statistics: (userId: number) =>
    api.get<ReportStatisticsResponse>(EP.report.statistics(userId)).then((r) => r.data),

  // ⚠️ year/month는 필수다 — 서버가 기본값을 두지 않는다(M3a RA-2, 서버 타임존 개입 방지).
  monthly: (userId: number, year: number, month: number) =>
    api.get<ReportMonthlyResponse>(EP.report.monthly(userId), { params: { year, month } }).then((r) => r.data),

  calendar: (userId: number, year: number, month: number) =>
    api.get<ReportCalendarResponse>(EP.report.calendar(userId), { params: { year, month } }).then((r) => r.data),
};
