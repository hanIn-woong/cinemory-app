import { RouteProp, useRoute } from '@react-navigation/native';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { ApiError } from '../../api/client';
import { AuthRequired, EmptyState, ErrorState, LoadingState } from '../../components/common';
import { Screen, Spacer, Txt } from '../../components/primitives';
import { ReportPieChart, SectionCard, StatTile, WatchTypeChart } from '../../components/report';
import { WEEKDAY_LABELS } from '../../constants/weekday';
import { useMonthlyReport, useYearlyReport } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, ratingScale } from '../../theme/tokens';
import type { ReportMonthlyResponse } from '../../types';
import { formatMinutes, formatStars } from '../../utils/reportFormat';
import { YearlyReportBody } from './YearlyReportBody';

type Rt = RouteProp<MyPageStackParamList, 'PeriodReport'>;
type PeriodTab = 'monthly' | 'yearly';

const TABS: { key: PeriodTab; label: string }[] = [
  { key: 'monthly', label: '월간' },
  { key: 'yearly', label: '연간' },
];

// 캘린더에서 진입하는 기간 리포트 — 월간 | 연간 세그먼트 탭(docs/M2C2-report-spec.md §9).
// 연·월은 진입 시점으로 고정한다 — 이동은 캘린더가 담당한다(§5.3·§9.1). ⚠️ 스와이프 전환 없음.
export function PeriodReportScreen() {
  const { params } = useRoute<Rt>();
  const { year, month } = params;
  const [tab, setTab] = useState<PeriodTab>(params.initialTab ?? 'monthly');
  // ⚠️ 한 번 연간 탭을 연 뒤에는 월간으로 돌아가도 enabled를 끄지 않는다 — false→true로 다시 켜질 때
  // 캐시가 stale(staleTime 30초)이면 재요청이 난다. 켜 둔 채면 탭 왕복에 요청이 없다(§9.7).
  const [yearlyRequested, setYearlyRequested] = useState(tab === 'yearly');
  const scrollRef = useRef<ScrollView>(null);

  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const monthly = useMonthlyReport(userId, year, month);
  const yearly = useYearlyReport(userId, year, yearlyRequested);

  // "올해" 판정은 기기 날짜로 — 서버는 진행 중 연도를 알려주지 않는다(RA-2).
  const isCurrentYear = year === new Date().getFullYear();

  if (!isAuthed) {
    return <AuthRequired description="리포트는 로그인 후 볼 수 있어요" />;
  }

  const selectTab = (next: PeriodTab) => {
    if (next === tab) return;
    if (next === 'yearly') setYearlyRequested(true);
    setTab(next);
    // 두 탭의 길이가 달라 위치를 유지하면 엉뚱한 섹션 중간에 떨어진다 — 맨 위로(§9.4).
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <Screen edges={['left', 'right']}>
      <Spacer size="md" />
      <View className="flex-row items-center">
        <Txt variant="h3">{tab === 'monthly' ? `${year}년 ${month}월` : `${year}년`}</Txt>
        {tab === 'yearly' && isCurrentYear && (
          <View className="ml-2 rounded-full bg-brand-light px-2 py-0.5">
            {/* TxtColor에 브랜드 짙은 색이 없다 — 연한 배경 위 대비를 위해 shadowDeep을 직접 준다 */}
            <Txt variant="caption" className="font-semibold" style={{ color: colors.shadowDeep }}>
              올해
            </Txt>
          </View>
        )}
      </View>
      <Spacer size="md" />

      <View className="flex-row rounded-lg bg-muted p-1">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => selectTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`flex-1 items-center rounded-md py-2 ${active ? 'bg-background' : ''}`}
            >
              <Txt variant="body" color={active ? 'foreground' : 'mutedForeground'} className="font-semibold">
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Spacer size="md" />

      <ScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {tab === 'monthly' ? (
          <MonthlyReportBody year={year} month={month} query={monthly} />
        ) : (
          <YearlyReportBody year={year} isCurrentYear={isCurrentYear} query={yearly} />
        )}
        <Spacer size="lg" />
      </ScrollView>
    </Screen>
  );
}

// 월간 탭 본문 — §5.3 규칙 그대로. 기록이 없어도 세그먼트는 남도록 빈 상태를 본문 안에서 그린다.
function MonthlyReportBody({
  year,
  month,
  query,
}: {
  year: number;
  month: number;
  query: UseQueryResult<ReportMonthlyResponse, ApiError>;
}) {
  if (query.isLoading) return <LoadingState variant="detail" />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />;
  }

  const data = query.data;
  if (!data.movieCount) {
    return <EmptyState title={`${year}년 ${month}월에는 기록이 없어요`} />;
  }

  const ratingBuckets = (data.ratingDistribution ?? []).filter((b) => (b.count ?? 0) > 0);

  return (
    <>
      <SectionCard title="요약">
        <Txt variant="caption" color="mutedForeground">
          {data.movieCount}편 · 총 {data.watchCount}회 관람
        </Txt>
        <Spacer size="sm" />
        <View className="flex-row">
          <StatTile value={formatStars(data.averageRating ?? 0)} unit="점" label="평균 별점" />
          <StatTile value={formatMinutes(data.totalWatchedMinutes ?? 0)} label="총 시청 시간" />
        </View>
      </SectionCard>
      <Spacer size="md" />

      {/* §4.1 — 월말 별점 분포는 PieChart. 표본이 적어 BarChart 10버킷보다 분포 형태가 낫다 */}
      {ratingBuckets.length > 0 && (
        <>
          <SectionCard title="별점 분포">
            <ReportPieChart
              data={ratingBuckets.map((b) => ({
                label: `${formatStars(b.rating ?? 0)}점`,
                value: b.count ?? 0,
                // 모든 조각이 같은 primary라 분간이 안 됐다 — 점수별 순차 팔레트(tokens.ratingScale)로.
                color: ratingScale[Math.min(Math.max((b.rating ?? 1) - 1, 0), ratingScale.length - 1)],
              }))}
            />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      <SectionCard title="관람 방식">
        <WatchTypeChart distribution={data.watchTypeDistribution} />
      </SectionCard>
      <Spacer size="md" />

      <SectionCard title="이달의 기록">
        {/* mostWatchedDirector는 편수(count) 기준 — 누적의 topDirectors(score 기준)와 문구를 섞지 않는다(§5.3) */}
        {data.mostWatchedDirector && (
          <Txt variant="caption" color="mutedForeground">
            가장 많이 본 감독 — {data.mostWatchedDirector.name}
          </Txt>
        )}
        {/* mostWatchedWeekday는 nullable Integer — 한 줄 문구로만, 차트는 그리지 않는다(§5.3) */}
        {data.mostWatchedWeekday != null && (
          <Txt variant="caption" color="mutedForeground" className="mt-1">
            가장 많이 본 요일 — {WEEKDAY_LABELS[data.mostWatchedWeekday]}요일
          </Txt>
        )}
      </SectionCard>
    </>
  );
}
