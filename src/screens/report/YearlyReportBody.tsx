import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UseQueryResult } from '@tanstack/react-query';
import { View } from 'react-native';
import type { ApiError } from '../../api/client';
import { EmptyState, ErrorState, LoadingState } from '../../components/common';
import { Spacer, Txt } from '../../components/primitives';
import { PersonAvatar } from '../../components/movie/PersonAvatar';
import {
  FiveStarGrid,
  RankRow,
  ReportBarChart,
  SectionCard,
  StatTile,
  WatchTypeChart,
  type PersonRankItem,
} from '../../components/report';
import { WEEKDAY_LABELS } from '../../constants/weekday';
import type { MyPageStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import type { PreferenceItemResponse, ReportYearlyResponse } from '../../types';
import { formatMinutes, formatStars } from '../../utils/reportFormat';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'PeriodReport'>;

interface YearlyReportBodyProps {
  year: number;
  isCurrentYear: boolean;
  // 쿼리는 화면(PeriodReportScreen)이 소유한다 — 이 본문은 탭이 바뀌면 언마운트되므로, 여기서 구독하면
  // 연간 탭으로 돌아올 때마다 stale 재요청이 난다(§9.7 "연간 → 월간 → 연간 재요청 없음").
  query: UseQueryResult<ReportYearlyResponse, ApiError>;
}

// 연간 탭 본문(docs/M2C2-report-spec.md §9.4). 섹션 순서는 §9.4 표 — 실기기에서 조정한다.
export function YearlyReportBody({ year, isCurrentYear, query }: YearlyReportBodyProps) {
  const navigation = useNavigation<Nav>();

  if (query.isLoading) return <LoadingState variant="detail" />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />;
  }

  const data = query.data;
  // 기록 0건인 연도(미래 연도 포함)는 400이 아니라 빈 값 200이다(5-8-F).
  if (!data.movieCount) {
    return <EmptyState title={`${year}년에는 기록이 없어요`} description="영화를 보고 기록을 남기면 연간 리포트를 볼 수 있어요" />;
  }

  // "올해"는 진행 중인 연도에만 — 지난 연도에는 "올해"가 틀린 말이라 연도를 쓴다(§9.1).
  const periodLabel = isCurrentYear ? '올해' : `${year}년에`;
  const fiveStarMovies = data.fiveStarMovies ?? [];
  const ratingBuckets = data.ratingDistribution ?? [];
  const monthlyTrend = data.monthlyTrend ?? [];
  const maxMonthCount = Math.max(0, ...monthlyTrend.map((m) => m.watchCount ?? 0));
  const weekdays = data.weekdayDistribution ?? [];
  const hasMostWatched =
    data.mostWatchedDirector != null ||
    data.mostWatchedActor != null ||
    (data.mostWatchedGenres?.length ?? 0) > 0 ||
    (data.mostWatchedCountries?.length ?? 0) > 0;

  return (
    <>
      {/* 1. 요약 */}
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

      {/* 2. 5점작 — 비면 섹션째 숨긴다(§9.5). ⚠️ 3의 5점 막대와 수가 다를 수 있다(목록형 vs 집계형) —
          제목에 "준"을 두고, 분포와 비교하게 만드는 캡션("5점 N편")을 달지 않는다(§9.4). */}
      {fiveStarMovies.length > 0 && (
        <>
          <SectionCard title={`${periodLabel} 5점을 준 작품`}>
            <FiveStarGrid
              movies={fiveStarMovies}
              onPressMovie={(movieId) => navigation.navigate('MovieDetail', { movieId })}
            />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      {/* 3. 별점 분포 — 10버킷 그대로(영화당 그해 마지막 별점) */}
      {ratingBuckets.length > 0 && (
        <>
          <SectionCard title="별점 분포">
            <ReportBarChart
              data={ratingBuckets.map((b) => ({ value: b.count ?? 0, label: formatStars(b.rating ?? 0) }))}
            />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      {/* 4. 월별 추이 — 12개 고정(공백 달 0), 가로 스크롤 없이. 가장 많이 본 달을 강조해 따로 적지 않는다 */}
      {monthlyTrend.length > 0 && (
        <>
          <SectionCard title="월별 추이">
            <ReportBarChart
              data={monthlyTrend.map((m) => ({
                value: m.watchCount ?? 0,
                // "12월"까지 붙이면 12칸에서 라벨이 겹친다 — 숫자만, 단위는 섹션 제목이 말한다
                label: `${m.month}`,
                frontColor: maxMonthCount > 0 && m.watchCount === maxMonthCount ? colors.primary : colors.brandLight,
              }))}
            />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      {/* 5. 관람 방식 */}
      <SectionCard title="관람 방식">
        <WatchTypeChart distribution={data.watchTypeDistribution} />
      </SectionCard>
      <Spacer size="md" />

      {/* 6. 많이 본 — ⚠️ 편수 정렬이라 "N편"을 보여도 순서와 맞는다. "선호"라고 쓰지 않는다(누적 topX는
          score 정렬, §9.4). 배우는 LEAD·SUPPORTING만 센 값이다(백엔드 10-3) */}
      {hasMostWatched && (
        <>
          <SectionCard title={`${periodLabel} 많이 본`}>
            <SingleItemRow title="감독" item={data.mostWatchedDirector} />
            <SingleItemRow title="배우" item={data.mostWatchedActor} />
            <RankGroup title="장르" items={data.mostWatchedGenres} />
            <RankGroup title="국가" items={data.mostWatchedCountries} />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      {/* 7. 요일 — 월간과 달리 차트로 그린다(1년 표본은 충분, §9.4). DAYOFWEEK 1=일 그대로 인덱싱 */}
      {weekdays.length > 0 && (
        <>
          <SectionCard title="요일">
            <ReportBarChart
              data={weekdays.map((w) => ({ value: w.count ?? 0, label: WEEKDAY_LABELS[w.weekday ?? 0] ?? '' }))}
            />
          </SectionCard>
          <Spacer size="md" />
        </>
      )}
    </>
  );
}

function formatCount(count?: number): string | undefined {
  return count != null ? `${count}편` : undefined;
}

// 라벨 · 사진(40) · 이름 · 편수 — 한 명만 보여 주는 자리라 1위 강조는 하지 않는다(§10.4).
function SingleItemRow({ title, item }: { title: string; item?: PersonRankItem }) {
  if (!item) return null;
  return (
    <View className="mb-2 flex-row items-center">
      <Txt variant="caption" color="mutedForeground" className="w-10">
        {title}
      </Txt>
      <PersonAvatar profilePath={item.profilePath ?? null} size={40} />
      <Txt variant="body" className="ml-3 flex-1" numberOfLines={1}>
        {item.name}
      </Txt>
      <Txt variant="caption" color="mutedForeground">
        {formatCount(item.count)}
      </Txt>
    </View>
  );
}

function RankGroup({ title, items }: { title: string; items?: PreferenceItemResponse[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View className="mt-2">
      <Txt variant="caption" color="mutedForeground" className="mb-1">
        {title}
      </Txt>
      {items.map((item, i) => (
        <RankRow key={item.id ?? i} rank={i + 1} label={item.name ?? ''} meta={formatCount(item.count)} />
      ))}
    </View>
  );
}
