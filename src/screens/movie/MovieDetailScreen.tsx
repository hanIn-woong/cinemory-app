import { useRoute, type RouteProp } from '@react-navigation/native';
import { Heart, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { ActionSheet, EmptyState, ErrorState, LoadingState, type ActionSheetOption } from '../../components/common';
import { PosterImage } from '../../components/movie/PosterImage';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Card, Divider, Screen, Spacer, Txt } from '../../components/primitives';
import { BackdropSize, ProfileSize, tmdbImageUrl } from '../../constants/tmdb';
import { useMovieDetail } from '../../hooks/useMovies';
import { useDeleteRecord, useSetRepresentative, useWatchLog } from '../../hooks/useRecords';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useMovieReviews, useMyReview } from '../../hooks/useReview';
import { useIsWished, useWishToggle } from '../../hooks/useWishlist';
import type { HomeStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';
import type { WatchRecordResponse, WatchType } from '../../types';
import { ReviewModal } from './ReviewModal';
import { WatchRecordModal } from './WatchRecordModal';

type Rt = RouteProp<HomeStackParamList, 'MovieDetail'>;

const WATCH_TYPE_LABEL: Record<WatchType, string> = {
  THEATER: '극장',
  OTT: 'OTT',
  ETC: '기타',
};

export function MovieDetailScreen() {
  const { movieId } = useRoute<Rt>().params;
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
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [recordSheet, setRecordSheet] = useState<WatchRecordResponse | null>(null);

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
  const heroUri = tmdbImageUrl(movie.posterPath, BackdropSize.DETAIL);

  function recordSheetOptions(record: WatchRecordResponse): ActionSheetOption[] {
    const options: ActionSheetOption[] = [];
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
      {/* 히어로 — MovieDetailResponse엔 backdropPath가 없어 posterPath로 대신한다 */}
      <View style={{ height: 256, backgroundColor: colors.muted }}>
        {heroUri && <Image source={{ uri: heroUri }} style={{ width: '100%', height: '100%' }} blurRadius={2} />}
      </View>

      <View className="px-4">
        <View style={{ marginTop: -56 }} className="flex-row items-end">
          <PosterImage id={movie.id!} posterPath={movie.posterPath} width={112} height={160} size="DETAIL" />
          <View className="ml-3 flex-1 pb-1">
            <Txt variant="h2" numberOfLines={2}>
              {movie.title}
            </Txt>
            <Spacer size="xs" />
            <Txt variant="caption" color="mutedForeground">
              {[year, movie.runtime ? `${movie.runtime}분` : null].filter(Boolean).join(' · ')}
            </Txt>
          </View>
        </View>

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
          <Spacer size="sm" />
          <Button
            variant="secondary"
            onPress={() => Alert.alert('준비 중', '컬렉션 기능은 곧 제공됩니다')}
          >
            컬렉션에 추가
          </Button>

          <Spacer size="md" />
          <Divider />
          <Spacer size="md" />

          {!isAuthed ? (
            <Button variant="secondary" onPress={() => requireAuth(() => {})}>
              로그인하고 시청 기록 남기기
            </Button>
          ) : watchLog.isLoading ? (
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
                      {record.representative ? ' · 대표' : ''}
                    </Txt>
                  </View>
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

          {!isAuthed ? (
            <Button variant="secondary" onPress={() => requireAuth(() => {})}>
              로그인하고 리뷰 남기기
            </Button>
          ) : myReview.isLoading ? (
            <LoadingState />
          ) : (
            <Button variant="secondary" onPress={() => setReviewModalVisible(true)}>
              {myReview.data ? '내 리뷰 수정' : '리뷰 쓰기'}
            </Button>
          )}
        </Card>

        <Spacer size="lg" />
        <Txt variant="h4">리뷰</Txt>
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
                <RatingStars rating={review.rating ?? 0} size={16} />
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
        onClose={() => setRecordModalVisible(false)}
        movieId={movieId}
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
