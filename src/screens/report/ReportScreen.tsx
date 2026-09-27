import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { PosterImage } from '../../components/movie/PosterImage';
import { Screen, Spacer, Txt } from '../../components/primitives';
import { RankRow, ReportBarChart, ReportPieChart, SectionCard, StatTile } from '../../components/report';
import { WATCH_TYPE_REPORT_COLOR, WATCH_TYPE_REPORT_LABEL, UNSPECIFIED_WATCH_TYPE } from '../../constants/watchType';
import { WEEKDAY_LABELS } from '../../constants/weekday';
import { useReportStatistics } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'Report'>;

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

// averageRating은 0.0~10.0 스케일 — 화면은 ÷2로 5점 만점 표기(§7.3 계약).
function formatStars(rating: number): string {
  return (rating / 2).toFixed(1);
}

export function ReportScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const stats = useReportStatistics(userId);

  if (!isAuthed) {
    return <AuthRequired description="시청 분석은 로그인 후 볼 수 있어요" />;
  }

  if (stats.isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (stats.isError || !stats.data) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={stats.error?.message} onRetry={() => stats.refetch()} />
      </Screen>
    );
  }

  const data = stats.data;

  // 기록 0건이면 404가 아니라 빈 값이 200으로 온다(RA-5) — EmptyState로 유도한다.
  if (!data.movieCount) {
    return (
      <Screen edges={['left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <Txt variant="h4" className="text-center">
            아직 기록이 없습니다
          </Txt>
          <Spacer size="xs" />
          <Txt variant="caption" color="mutedForeground" className="text-center">
            영화를 보고 기록을 남기면 분석을 볼 수 있어요
          </Txt>
        </View>
      </Screen>
    );
  }

  const ratingBuckets = data.ratingDistribution ?? [];
  const monthlyTrend = data.monthlyTrend ?? [];
  const recentMonthlyTrend = monthlyTrend.slice(-12);
  const watchTypes = data.watchTypeDistribution ?? [];
  const watchTypeTotal = watchTypes.reduce((sum, w) => sum + (w.count ?? 0), 0);
  const unspecifiedCount = watchTypes.find((w) => w.watchType === UNSPECIFIED_WATCH_TYPE)?.count ?? 0;
  const unspecifiedIsMajority = watchTypeTotal > 0 && unspecifiedCount / watchTypeTotal > 0.5;
  const ottPlatforms = data.ottPlatformDistribution ?? [];
  const decades = data.releaseDecadeDistribution ?? [];
  const weekdays = data.weekdayDistribution ?? [];
  const reviewCount = data.movieCount ? Math.round((data.reviewRate ?? 0) * data.movieCount) : 0;

  return (
    // ⚠️ top을 뺀다 — 네이티브 헤더가 이미 상단 안전영역을 소화하므로, 기본 edges(top 포함)면
    // 헤더 아래에 안전영역 높이만큼 빈 띠가 한 번 더 생겨 툴바처럼 보였다(2026-09-28, 리포트 3화면 공통).
    <Screen scroll edges={['left', 'right']}>
      <Spacer size="md" />

      {/* 1. 요약 타일 */}
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

      {/* 2. 별점 분포 */}
      <SectionCard title="별점 분포">
        {ratingBuckets.length > 0 && (
          <ReportBarChart
            data={ratingBuckets.map((b) => ({ value: b.count ?? 0, label: ((b.rating ?? 0) / 2).toFixed(1) }))}
          />
        )}
      </SectionCard>
      <Spacer size="md" />

      {/* 3. 선호 TOP */}
      <SectionCard title="선호 TOP">
        <PreferenceGroup title="장르" items={data.topGenres} />
        <PreferenceGroup title="국가" items={data.topCountries} />
        <PreferenceGroup title="감독" items={data.topDirectors} />
        <PreferenceGroup title="배우" items={data.topActors} />
      </SectionCard>
      <Spacer size="md" />

      {/* 4. 월별 추이 */}
      <SectionCard title="월별 추이">
        {(data.undatedCount ?? 0) > 0 && (
          <>
            <Txt variant="caption" color="mutedForeground">
              날짜 미상 {data.undatedCount}편 제외
            </Txt>
            <Spacer size="sm" />
          </>
        )}
        {recentMonthlyTrend.length > 0 && (
          <ReportBarChart
            data={recentMonthlyTrend.map((m) => ({ value: m.watchCount ?? 0, label: `${m.month}월` }))}
            scrollable={monthlyTrend.length > 12}
          />
        )}
      </SectionCard>
      <Spacer size="md" />

      {/* 5. 관람 방식 */}
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
        {ottPlatforms.length > 0 && (
          <>
            <Spacer size="md" />
            <Txt variant="caption" color="mutedForeground" className="mb-1">
              OTT 플랫폼
            </Txt>
            {ottPlatforms.map((p, i) => (
              <RankRow key={p.id ?? i} rank={i + 1} label={p.name ?? ''} meta={p.count != null ? `${p.count}회` : undefined} />
            ))}
          </>
        )}
      </SectionCard>
      <Spacer size="md" />

      {/* 6. 나와 대중 */}
      <SectionCard title="나와 대중">
        <Txt variant="caption" color="mutedForeground">
          {(data.ratingBiasAverage ?? 0) >= 0
            ? `평단보다 평균 +${((data.ratingBiasAverage ?? 0) / 2).toFixed(1)}점 후하게`
            : `평단보다 평균 ${((data.ratingBiasAverage ?? 0) / 2).toFixed(1)}점 박하게`}
        </Txt>
        {data.mostOverratedByMe && (
          <>
            <Spacer size="sm" />
            <RatingGapRow
              label="내가 후하게 준 영화"
              item={data.mostOverratedByMe}
              onPress={() => navigation.navigate('MovieDetail', { movieId: data.mostOverratedByMe!.movieId! })}
            />
          </>
        )}
        {data.mostUnderratedByMe && (
          <>
            <Spacer size="sm" />
            <RatingGapRow
              label="내가 박하게 준 영화"
              item={data.mostUnderratedByMe}
              onPress={() => navigation.navigate('MovieDetail', { movieId: data.mostUnderratedByMe!.movieId! })}
            />
          </>
        )}
      </SectionCard>
      <Spacer size="md" />

      {/* 7. 다시 본 영화 — rewatchTop이 비면 섹션을 숨긴다 */}
      {(data.rewatchTop?.length ?? 0) > 0 && (
        <>
          <SectionCard title="다시 본 영화">
            <Txt variant="caption" color="mutedForeground">
              재관람 {data.rewatchCount ?? 0}회
            </Txt>
            <Spacer size="sm" />
            {data.rewatchTop!.map((item, i) => (
              <RankRow
                key={item.movieId ?? i}
                rank={i + 1}
                label={item.title ?? ''}
                meta={item.watchCount != null ? `${item.watchCount}회` : undefined}
                posterPath={item.posterPath}
                movieId={item.movieId}
                onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId! })}
              />
            ))}
          </SectionCard>
          <Spacer size="md" />
        </>
      )}

      {/* 8. 연대와 고전 */}
      <SectionCard title="연대와 고전" headerRight={<Txt variant="h3">{data.classicCount ?? 0}편</Txt>}>
        {decades.length > 0 && (
          <ReportBarChart data={decades.map((d) => ({ value: d.count ?? 0, label: d.decade ?? '' }))} scrollable />
        )}
        {data.oldestWatched && (
          <>
            <Spacer size="sm" />
            <Txt variant="caption" color="mutedForeground">
              가장 오래된 관람작 — {data.oldestWatched.title}
              {data.oldestWatched.releaseDate ? ` (${data.oldestWatched.releaseDate.slice(0, 4)})` : ''}
            </Txt>
          </>
        )}
      </SectionCard>
      <Spacer size="md" />

      {/* 9. 요일 */}
      <SectionCard title="요일">
        {weekdays.length > 0 && (
          <ReportBarChart
            data={weekdays.map((w) => ({ value: w.count ?? 0, label: WEEKDAY_LABELS[w.weekday ?? 0] ?? '' }))}
          />
        )}
      </SectionCard>
      <Spacer size="md" />

      {/* 10. 기록 습관 */}
      <SectionCard title="기록 습관">
        {data.firstRecordDate && (
          <Txt variant="caption" color="mutedForeground">
            CineMory와 함께한{' '}
            {Math.floor((Date.now() - new Date(data.firstRecordDate).getTime()) / (1000 * 60 * 60 * 24))}일
          </Txt>
        )}
        <Spacer size="xs" />
        {/* reviewRate는 0~1 비율이라 퍼센트로 쓰지 않는다(§6.3) — 두 숫자로 그대로 보여준다 */}
        <Txt variant="caption" color="mutedForeground">
          {data.movieCount}편 중 {reviewCount}편에 리뷰
        </Txt>
      </SectionCard>
      <Spacer size="xl" />
    </Screen>
  );
}

function PreferenceGroup({
  title,
  items,
}: {
  title: string;
  items?: { id?: number; name?: string; score?: number }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <View className="mb-3">
      <Txt variant="caption" color="mutedForeground" className="mb-1">
        {title}
      </Txt>
      {/* ⚠️ score로 정렬돼 있다 — count(편수)를 부제로 쓰지 않는다(§5.1 3번, RA-4) */}
      {items.slice(0, 5).map((item, i) => (
        <RankRow key={item.id ?? i} rank={i + 1} label={item.name ?? ''} />
      ))}
    </View>
  );
}

function RatingGapRow({
  label,
  item,
  onPress,
}: {
  label: string;
  item: { movieId?: number; title?: string; posterPath?: string; myRating?: number; publicRating?: number };
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center">
      <PosterImage id={item.movieId ?? 0} posterPath={item.posterPath} width={48} height={68} />
      <View className="ml-3 flex-1">
        <Txt variant="caption" color="mutedForeground">
          {label}
        </Txt>
        <Txt variant="body" numberOfLines={1} onPress={onPress}>
          {item.title}
        </Txt>
        <Txt variant="caption" color="mutedForeground">
          내 별점 {((item.myRating ?? 0) / 2).toFixed(1)} · 대중 {((item.publicRating ?? 0) / 2).toFixed(1)}
        </Txt>
      </View>
    </View>
  );
}
