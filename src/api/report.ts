import { api } from './client';
import { EP } from './endpoints';
import type {
  ReportCalendarResponse,
  ReportMonthlyResponse,
  ReportStatisticsResponse,
  ReportYearlyResponse,
} from '../types';

export const reportApi = {
  statistics: (userId: number) =>
    api.get<ReportStatisticsResponse>(EP.report.statistics(userId)).then((r) => r.data),

  // ⚠️ year/month는 필수다 — 서버가 기본값을 두지 않는다(M3a RA-2, 서버 타임존 개입 방지).
  monthly: (userId: number, year: number, month: number) =>
    api.get<ReportMonthlyResponse>(EP.report.monthly(userId), { params: { year, month } }).then((r) => r.data),

  calendar: (userId: number, year: number, month: number) =>
    api.get<ReportCalendarResponse>(EP.report.calendar(userId), { params: { year, month } }).then((r) => r.data),

  // ⚠️ year 필수 — 월간과 같은 이유로 서버 기본값이 없다. 미래 연도는 빈 값 200(§9.3).
  yearly: (userId: number, year: number) =>
    api.get<ReportYearlyResponse>(EP.report.yearly(userId), { params: { year } }).then((r) => r.data),
};
