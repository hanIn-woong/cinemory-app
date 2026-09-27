import { RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { Screen, Spacer, Txt } from '../../components/primitives';
import { ReportPieChart, SectionCard, StatTile } from '../../components/report';
import { UNSPECIFIED_WATCH_TYPE, WATCH_TYPE_REPORT_COLOR, WATCH_TYPE_REPORT_LABEL } from '../../constants/watchType';
import { WEEKDAY_LABELS } from '../../constants/weekday';
import { useMonthlyReport } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

type Rt = RouteProp<MyPageStackParamList, 'MonthlyReport'>;

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export function MonthlyReportScreen() {
  const { params } = useRoute<Rt>();
  const { year, month } = params;
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const report = useMonthlyReport(userId, year, month);

  if (!isAuthed) {
    return <AuthRequired description="월말 리포트는 로그인 후 볼 수 있어요" />;
  }

  if (report.isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (report.isError || !report.data) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={report.error?.message} onRetry={() => report.refetch()} />
      </Screen>
    );
  }

  const data = report.data;

  if (!data.movieCount) {
    return (
      <Screen edges={['left', 'right']}>
        <Txt variant="body" color="mutedForeground" className="mt-12 text-center">
          {year}년 {month}월에는 기록이 없어요
        </Txt>
      </Screen>
    );
  }

  const watchTypes = data.watchTypeDistribution ?? [];
  const watchTypeTotal = watchTypes.reduce((sum, w) => sum + (w.count ?? 0), 0);
  const unspecifiedCount = watchTypes.find((w) => w.watchType === UNSPECIFIED_WATCH_TYPE)?.count ?? 0;
  const unspecifiedIsMajority = watchTypeTotal > 0 && unspecifiedCount / watchTypeTotal > 0.5;
  const ratingBuckets = (data.ratingDistribution ?? []).filter((b) => (b.count ?? 0) > 0);

  return (
    <Screen scroll edges={['left', 'right']}>
      <Spacer size="md" />
      <Txt variant="h3">
        {year}년 {month}월 리포트
      </Txt>
      <Spacer size="md" />

      <SectionCard title="요약">
        <Txt variant="caption" color="mutedForeground">
          {data.movieCount}편 · 총 {data.watchCount}회 관람
        </Txt>
        <Spacer size="sm" />
        <View className="flex-row">
          <StatTile value={((data.averageRating ?? 0) / 2).toFixed(1)} unit="점" label="평균 별점" />
          <StatTile value={formatMinutes(data.totalWatchedMinutes ?? 0)} label="총 시청 시간" />
        </View>
      </SectionCard>
      <Spacer size="md" />

      {/* §4.1 — 월말 평점 분포는 PieChart. 표본이 적어 BarChart 10버킷보다 분포 형태가 낫다 */}
      {ratingBuckets.length > 0 && (
        <>
          <SectionCard title="평점 분포">
            <ReportPieChart
              data={ratingBuckets.map((b) => ({
                label: `${((b.rating ?? 0) / 2).toFixed(1)}점`,
                value: b.count ?? 0,
                color: colors.primary,
              }))}
            />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      <SectionCard title="관람 방식">
        {unspecifiedIsMajority ? (
          <Txt variant="caption" color="mutedForeground">
            관람 방식을 기록하면 분포를 볼 수 있어요
          </Txt>
        ) : (
          watchTypes.length > 0 && (
            <ReportPieChart
              data={watchTypes.map((w) => ({
                label: WATCH_TYPE_REPORT_LABEL[w.watchType ?? ''] ?? w.watchType ?? '',
                value: w.count ?? 0,
                color: WATCH_TYPE_REPORT_COLOR[w.watchType ?? ''] ?? colors.mutedForeground,
              }))}
            />
          )
        )}
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
      <Spacer size="xl" />
    </Screen>
  );
}
