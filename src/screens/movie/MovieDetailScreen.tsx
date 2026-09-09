import { useRoute, type RouteProp } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { ActionSheet, EmptyState, ErrorState, LoadingState, type ActionSheetOption } from '../../components/common';
import { CollectionPickerSheet } from '../../components/collection/CollectionPickerSheet';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Card, Divider, Screen, Spacer, Txt } from '../../components/primitives';
import { PosterSize, ProfileSize, tmdbImageUrl } from '../../constants/tmdb';
import { useMovieDetail } from '../../hooks/useMovies';
import { useDeleteRecord, useSetRepresentative, useWatchLog } from '../../hooks/useRecords';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useMovieReviews, useMyReview } from '../../hooks/useReview';
import { useIsWished, useWishToggle } from '../../hooks/useWishlist';
import type { HomeStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, layout } from '../../theme/tokens';
import type { WatchRecordResponse, WatchType } from '../../types';
import { ReviewModal } from './ReviewModal';
import { WatchRecordModal } from './WatchRecordModal';

type Rt = RouteProp<HomeStackParamList, 'MovieDetail'>;

const WATCH_TYPE_LABEL: Record<WatchType, string> = {
  THEATER: '극장',
  OTT: 'OTT',
  ETC: '기타',
};

// 히어로 블러 영역(제목·년도·러닝타임이 놓이는 하단 밴드) 높이 비율.
const HERO_BLUR_ZONE_RATIO = 0.42;
// ⚠️ Image의 blurRadius를 여러 겹으로 잘라 쓰는 방식은 계단이 실기기에서 뚜렷이
// 보였다(2026-09-10). expo-blur의 BlurView로 교체 — 원본 이미지 위에 얹기만 하면
// 그 자리에서 바로 블러를 계산해 주므로 이미지를 잘라 겹치는 수작업이 필요 없고,
// 네이티브 블러라 화질도 낫다. 홈 배경 때는 60초 루프 애니메이션 위에 실시간으로
// 다시 계산해야 해서 Android 성능을 우려해 피했는데, 여기는 스크롤해도 안 움직이는
// 정적 이미지 한 장이라 상황이 다르다.
const HERO_BLUR_INTENSITIES = [15, 35, 55, 80, 100];
// 텍스트는 밴드 전체가 아니라 위쪽 65%에만 둔다 — 아래쪽은 배경색으로 빠지는
// 페이드 구간이라 글자를 놓으면 대비가 사라진다.
const HERO_TEXT_ZONE_RATIO = 0.65;

export function MovieDetailScreen() {
  const { movieId } = useRoute<Rt>().params;
  const { width: windowWidth } = useWindowDimensions();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const myId = useAuthStore((s) => s.user?.id);
  const requireAuth = useRequireAuth();

  const detail = useMovieDetail(movieId);
  const watchLog = useWatchLog(myId ?? 0, movieId);
  const myReview = useMyReview(movieId);
  const isWished = useIsWished(movieId);
  const publicReviews = useMovieReviews(movieId);

  const wishToggle = useWishToggle();
  const deleteRecord = useDeleteRecord();
  const setRepresentative = useSetRepresentative();

  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WatchRecordResponse | null>(null);
  const [editingMinDate, setEditingMinDate] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [recordSheet, setRecordSheet] = useState<WatchRecordResponse | null>(null);
  const [collectionSheetVisible, setCollectionSheetVisible] = useState(false);

  function closeRecordModal() {
    setRecordModalVisible(false);
    setEditingRecord(null);
    setEditingMinDate(null);
  }

  if (detail.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <ErrorState message={detail.error?.message} onRetry={() => detail.refetch()} />
      </Screen>
    );
  }

  const movie = detail.data;
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
  const heroUri = tmdbImageUrl(movie.posterPath, PosterSize.HERO);
  // 2:3 포스터 비율 그대로 화면 폭에 꽉 채운다.
  const heroHeight = windowWidth / layout.posterAspectRatio;
  const heroBlurZoneHeight = heroHeight * HERO_BLUR_ZONE_RATIO;

  function recordSheetOptions(record: WatchRecordResponse): ActionSheetOption[] {
    const options: ActionSheetOption[] = [
      {
        label: '수정',
        onPress: () => {
          // 이전 회차들(먼저 본 회차) 중 날짜가 있는 가장 가까운 것보다 앞선 날짜로는
          // 못 고치게 막는다. 목록은 id DESC(최신 생성 순)라 "이전"은 배열상 뒤쪽이고,
          // 그 구간에서 날짜 없는 회차는 건너뛰고 날짜 있는 첫 회차를 찾는다.
          const records = watchLog.data ?? [];
          const index = records.findIndex((r) => r.id === record.id);
          const previousWithDate =
            index >= 0 ? records.slice(index + 1).find((r) => r.watchDate != null) : undefined;
          setEditingRecord(record);
          setEditingMinDate(previousWithDate?.watchDate ?? null);
          setRecordModalVisible(true);
        },
      },
    ];
    if (!record.representative) {
      options.push({
        label: '대표 기록으로 지정',
        onPress: () =>
          setRepresentative.mutate(
            { recordId: record.id!, userId: myId!, movieId },
            { onError: (error) => Alert.alert('실패', error.message) },
          ),
      });
    }
    options.push({
      label: '삭제',
      destructive: true,
      onPress: () => deleteRecord.mutate(record.id!, { onError: (error) => Alert.alert('실패', error.message) }),
    });
    return options;
  }

  return (
    <Screen edges={['left', 'right']} scroll padded={false}>
      {/* 히어로 — 화면 폭 대형 포스터. MovieDetailResponse엔 backdropPath가 없어
          posterPath를 그대로 키운다(2026-09-10, 배경 이미지를 대형 포스터로 교체). 하단
          밴드는 5단계 BlurView + 배경색으로 빠지는 그라디언트로 처리해 아래 콘텐츠와
          자연스럽게 이어지도록 하고, 그 위에 제목·년도·러닝타임을 얹는다. */}
      <View style={{ width: windowWidth, height: heroHeight, backgroundColor: colors.muted }}>
        {heroUri && (
          <>
            <Image
              source={{ uri: heroUri }}
              style={{ position: 'absolute', width: windowWidth, height: heroHeight }}
              resizeMode="cover"
            />
            {/* BlurView는 자기 자리에서 바로 밑을 블러 처리해 준다 — Image를 잘라 겹치는
                수작업이 필요 없다. 세기가 다른 밴드를 쌓아 점진적으로 흐려지는 느낌을 낸다. */}
            {HERO_BLUR_INTENSITIES.map((intensity, index) => {
              const bandCount = HERO_BLUR_INTENSITIES.length;
              const bandHeight = heroBlurZoneHeight / bandCount;
              // index 0 = 맨 위(선명한 영역과 맞닿는 곳, 약하게) · 마지막 index = 맨 아래(가장 강하게).
              const bottomOffset = (bandCount - 1 - index) * bandHeight;
              return (
                <BlurView
                  key={index}
                  intensity={intensity}
                  tint="dark"
                  style={{ position: 'absolute', left: 0, right: 0, bottom: bottomOffset, height: bandHeight }}
                />
              );
            })}
          </>
        )}
        {/* ⚠️ 검정으로 끝내지 않고 화면 배경색으로 끝낸다 — 히어로 블록과 아래 카드 사이에
            색이 뚝 끊기는 경계가 생기지 않고 그대로 녹아들듯 이어진다. */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.6)', colors.background]}
          locations={[0, 0.3, 0.6, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: heroBlurZoneHeight }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: heroHeight - heroBlurZoneHeight,
            height: heroBlurZoneHeight * HERO_TEXT_ZONE_RATIO,
          }}
          className="items-center justify-center px-6"
        >
          <Txt variant="h2" color="primaryForeground" numberOfLines={2} className="text-center">
            {movie.title}
          </Txt>
          <Spacer size="xs" />
          <Txt variant="body" color="primaryForeground" className="text-center">
            {[year, movie.runtime ? `${movie.runtime}분` : null].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </View>

      <View className="px-4">
        <Spacer size="lg" />
        <Card>
          <InfoRow label="장르" value={movie.genres?.map((g) => g.name).join(', ')} />
          <InfoRow label="국가" value={movie.countries?.map((c) => c.name).join(', ')} />
          <InfoRow label="감독" value={movie.directors?.map((d) => d.name).join(', ')} />
          {movie.actors && movie.actors.length > 0 && (
            <>
              <Spacer size="sm" />
              <Txt variant="caption" color="mutedForeground">
                출연
              </Txt>
              <Spacer size="xs" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {movie.actors.map((actor) => (
                  <View key={actor.id} className="mr-4 w-16 items-center">
                    <ActorAvatar profilePath={actor.profilePath} />
                    <Spacer size="xs" />
                    <Txt variant="caption" numberOfLines={2} className="text-center">
                      {actor.name}
                    </Txt>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </Card>

        {movie.overview && (
          <>
            <Spacer size="lg" />
            <Txt variant="h4">줄거리</Txt>
            <Spacer size="xs" />
            <Txt variant="body" color="mutedForeground">
              {movie.overview}
            </Txt>
          </>
        )}

        {/* 평점 영역은 B-4(voteAverage/voteCount 미노출) 전까지 자리만 두고 숨긴다 (§6) */}

        <Spacer size="lg" />
        <Card>
          {/* 찜 버튼은 게스트에게도 항상 보인다 — 탭 시 requireAuth가 모달을 띄운다.
              그 외(컬렉션·기록·리뷰)는 게스트에게 카드 자리에 로그인 유도만 보여준다(§5.4). */}
          <View className="flex-row items-center justify-between">
            <Txt variant="h4">내 기록</Txt>
            <Pressable
              hitSlop={8}
              onPress={() => requireAuth(() => wishToggle.mutate(movieId))}
              disabled={wishToggle.isPending}
            >
              <Heart
                size={24}
                color={colors.destructive}
                fill={isAuthed && isWished.data?.wished ? colors.destructive : 'transparent'}
              />
            </Pressable>
          </View>

          {/* 찜과 마찬가지로 게스트에게도 항상 보인다 — 탭 시 requireAuth가 모달을 띄운다(G-1). */}
          <Spacer size="sm" />
          <Button variant="secondary" onPress={() => requireAuth(() => setCollectionSheetVisible(true))}>
            컬렉션에 추가
          </Button>

          {!isAuthed ? (
            <>
              <Spacer size="md" />
              <Divider />
              <Spacer size="md" />
              <Txt variant="body" color="mutedForeground" className="text-center">
                기록하려면 로그인하세요
              </Txt>
              <Spacer size="sm" />
              <Button variant="secondary" onPress={() => requireAuth(() => {})}>
                로그인
              </Button>
            </>
          ) : (
            <>
              <Spacer size="md" />
              <Divider />
              <Spacer size="md" />

              {watchLog.isLoading ? (
                <LoadingState />
              ) : watchLog.isError ? (
                <ErrorState message={watchLog.error.message} onRetry={() => watchLog.refetch()} />
              ) : (
                <>
                  {(watchLog.data ?? []).map((record) => (
                    <Pressable key={record.id} onPress={() => setRecordSheet(record)} className="py-2">
                      <View className="flex-row items-center justify-between">
                        <Txt variant="body">
                          {record.watchDate ?? '날짜 미기록'}
                          {record.watchType ? ` · ${WATCH_TYPE_LABEL[record.watchType]}` : ''}
                          {record.placeDetail ? ` · ${record.placeDetail}` : ''}
                          {record.representative ? ' · 대표' : ''}
                        </Txt>
                      </View>
                      {record.note && (
                        <>
                          <Spacer size="xs" />
                          <Txt variant="caption" color="mutedForeground">
                            {record.note}
                          </Txt>
                        </>
                      )}
                      {record.rating != null && (
                        <>
                          <Spacer size="xs" />
                          <RatingStars rating={record.rating} size={16} />
                        </>
                      )}
                    </Pressable>
                  ))}
                  {(watchLog.data ?? []).length === 0 && (
                    <Txt variant="caption" color="mutedForeground">
                      아직 시청 기록이 없어요
                    </Txt>
                  )}
                  <Spacer size="sm" />
                  <Button variant="secondary" onPress={() => setRecordModalVisible(true)}>
                    시청 기록 추가
                  </Button>
                </>
              )}

              <Spacer size="md" />
              <Divider />
              <Spacer size="md" />

              {myReview.isLoading ? (
                <LoadingState />
              ) : (
                <Button variant="secondary" onPress={() => setReviewModalVisible(true)}>
                  {myReview.data ? '내 리뷰 수정' : '리뷰 쓰기'}
                </Button>
              )}
            </>
          )}
        </Card>

        <Spacer size="lg" />
        <Txt variant="h4">리뷰</Txt>
        <Spacer size="xs" />
        <Txt variant="caption" color="mutedForeground">
          별점은 작성자의 대표 시청 기록에서 가져옵니다
        </Txt>
        <Spacer size="sm" />
        {publicReviews.isLoading ? (
          <LoadingState />
        ) : publicReviews.isError || !publicReviews.data ? (
          <ErrorState message={publicReviews.error?.message} onRetry={() => publicReviews.refetch()} />
        ) : publicReviews.data.content.length === 0 ? (
          <EmptyState title="아직 리뷰가 없어요" />
        ) : (
          publicReviews.data.content.map((review) => (
            <Card key={review.id} className="mb-2">
              <View className="flex-row items-center justify-between">
                <Txt variant="body" className="font-semibold">
                  {review.author?.nickname ?? '알 수 없음'}
                </Txt>
                {/* rating은 nullable — 기록이 없거나 별점을 한 번도 안 매긴 경우. null이면 생략한다 */}
                {review.rating != null && <RatingStars rating={review.rating} size={16} />}
              </View>
              <Spacer size="xs" />
              <Txt variant="body" color="mutedForeground">
                {review.content}
              </Txt>
            </Card>
          ))
        )}

        <Spacer size="xl" />
      </View>

      <WatchRecordModal
        visible={recordModalVisible}
        onClose={closeRecordModal}
        movieId={movieId}
        editing={editingRecord}
        minDate={editingMinDate}
      />
      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        movieId={movieId}
        initial={myReview.data ?? null}
      />
      <ActionSheet
        visible={recordSheet != null}
        onClose={() => setRecordSheet(null)}
        options={recordSheet ? recordSheetOptions(recordSheet) : []}
      />
      <CollectionPickerSheet
        visible={collectionSheetVisible}
        onClose={() => setCollectionSheetVisible(false)}
        movieId={movieId}
      />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View className="flex-row py-1">
      <Txt variant="caption" color="mutedForeground" className="w-12">
        {label}
      </Txt>
      <Txt variant="body" className="flex-1">
        {value}
      </Txt>
    </View>
  );
}

function ActorAvatar({ profilePath }: { profilePath?: string | null }) {
  const uri = tmdbImageUrl(profilePath, ProfileSize.LIST);
  if (!uri) {
    return (
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <UserIcon size={24} color={colors.mutedForeground} />
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 32 }} />;
}
