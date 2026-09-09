import { useRoute, type RouteProp } from '@react-navigation/native';
import { Heart, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { ActionSheet, EmptyState, ErrorState, LoadingState, type ActionSheetOption } from '../../components/common';
import { CollectionPickerSheet } from '../../components/collection/CollectionPickerSheet';
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
  const heroUri = tmdbImageUrl(movie.posterPath, BackdropSize.DETAIL);

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
