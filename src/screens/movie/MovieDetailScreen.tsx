import { useRoute, type RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Heart, Maximize2, User as UserIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionSheet, EmptyState, ErrorState, LoadingState, type ActionSheetOption } from '../../components/common';
import { CollectionPickerSheet } from '../../components/collection/CollectionPickerSheet';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Card, Divider, Screen, Spacer, Txt } from '../../components/primitives';
import { PosterSize, ProfileSize, tmdbImageUrl } from '../../constants/tmdb';
import { useMovieDetail } from '../../hooks/useMovies';
import { useDeleteRecord, useSetRepresentative, useUpdateRecord, useWatchLog } from '../../hooks/useRecords';
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

// ⚠️ 이음매 문제와 텍스트 배치 문제가 같은 문제였다(2026-09-10 재설계, 상위 §9.3) —
// 제목을 포스터 위에 얹으려면 흰 글씨→어두운 스크림→흰 배경으로 이어질 때 값이
// 반전돼 탁한 회색 띠가 생긴다. 텍스트를 히어로 밖으로 빼서 이 사슬을 끊었다 —
// 스크림이 필요 없어지고 포스터를 배경색으로 그대로 페이드하면 이을 경계 자체가 없다.
// 4:5로 상단 기준 크롭하는 이유는 2:3 full-bleed(390px 기기에서 585px, 화면의 69%)면
// 장르·감독·출연이 전부 스크롤 밖으로 밀리기 때문이다.
// ⚠️ 1:1(46%)까지 줄여봤으나 실기기에서 "너무 줄였다"는 피드백으로 4:5로 롤백했다
// (2026-09-10) — 정보 박스 노출과 포스터 비중 사이의 정확한 지점은 추후 미세조정 예정.
const HERO_ASPECT_RATIO = 4 / 5; // width:height
const HERO_FADE_RATIO = 0.38; // 하단 페이드 밴드 높이 비율

export function MovieDetailScreen() {
  const { movieId } = useRoute<Rt>().params;
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const updateRecord = useUpdateRecord();

  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WatchRecordResponse | null>(null);
  const [editingMinDate, setEditingMinDate] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [recordSheet, setRecordSheet] = useState<WatchRecordResponse | null>(null);
  const [collectionSheetVisible, setCollectionSheetVisible] = useState(false);
  const [posterModalVisible, setPosterModalVisible] = useState(false);

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
  // 대표 기록 → (null이면) 별점 있는 가장 최근 기록 → 없으면 별점 없음. 공개 리뷰의
  // 파생 별점과 같은 폴백 규칙이다(2026-09-01 확정, watchLog는 이미 id DESC로 온다).
  // 리뷰를 안 썼어도(myReview 없음) 시청 기록만으로 뜨게 하려고 watchLog에서 직접 뽑는다.
  const representativeRecord = watchLog.data?.find((r) => r.representative);
  const myRating = representativeRecord?.rating ?? watchLog.data?.find((r) => r.rating != null)?.rating ?? null;
  const heroUri = tmdbImageUrl(movie.posterPath, PosterSize.HERO);
  // 히어로 컨테이너는 4:5 — 원본 포스터(2:3)를 top:0에 두고 컨테이너로 아래쪽만 자른다.
  const heroHeight = windowWidth / HERO_ASPECT_RATIO;
  const posterNaturalHeight = windowWidth / layout.posterAspectRatio;
  const heroFadeHeight = heroHeight * HERO_FADE_RATIO;

  // ⚠️ PATCH /api/records/{id}는 전체 치환이다(B-15) — rating만 보내면 나머지 필드가
  // null로 지워진다. 대표 기록의 기존 값을 그대로 다시 실어 보낸다(WatchRecordModal의
  // 수정 흐름과 동일한 이유).
  //
  // ⚠️ RatingStars는 "같은 별을 다시 탭하면 0(해제)"을 보낸다 — WatchRecordModal처럼
  // "저장" 전 임시 상태에서는 안전하지만, 여기는 탭마다 바로 저장이라 현재 별점과 같은
  // 위치를 탭하면 그대로 지워져 저장되는 버그가 됐다(실기기 확인). 0은 무시한다 —
  // 별점을 지우고 싶으면 "시청 기록 수정" 모달을 쓴다.
  function handleChangeMyRating(nextRating: number) {
    if (!representativeRecord || nextRating <= 0) return;
    updateRecord.mutate(
      {
        recordId: representativeRecord.id!,
        movieId,
        body: {
          watchDate: representativeRecord.watchDate ?? undefined,
          watchType: representativeRecord.watchType ?? undefined,
          placeDetail: representativeRecord.placeDetail ?? undefined,
          rating: nextRating,
          note: representativeRecord.note ?? undefined,
        },
      },
      { onError: (error) => Alert.alert('저장 실패', error.message) },
    );
  }

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
      {/* 히어로 — 4:5로 상단 기준 크롭한 대형 포스터. MovieDetailResponse엔 backdropPath가
          없어 posterPath를 그대로 키운다. 원본(2:3)을 top:0에 두고 컨테이너(overflow
          hidden)로 아래쪽만 잘라낸다 — resizeMode="cover"는 가운데 기준이라 인물·타이틀이
          있는 위쪽이 잘리므로 쓰지 않는다. 잘리는 하단은 어차피 페이드가 덮는다.
          탭하면 크롭 전 원본을 볼 수 있다(§9.3 "히어로 탭 → 포스터 전체 보기"). */}
      <Pressable
        onPress={() => setPosterModalVisible(true)}
        disabled={!movie.posterPath}
        accessibilityRole="imagebutton"
        accessibilityLabel="포스터 전체 보기"
      >
        <View style={{ width: windowWidth, height: heroHeight, overflow: 'hidden', backgroundColor: colors.muted }}>
          {heroUri && (
            <Image
              source={{ uri: heroUri }}
              style={{ position: 'absolute', top: 0, left: 0, width: windowWidth, height: posterNaturalHeight }}
            />
          )}
          {/* ⚠️ 검정 스크림이 아니라 화면 배경색 자체로 페이드한다 — 제목을 히어로 밖으로
              뺐기 때문에 대비를 위한 어두운 스크림이 필요 없고, 그래서 이을 경계 자체가
              없다(이전엔 검정→흰색 전환 구간이 탁한 회색 띠로 보였다). */}
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)', colors.background]}
            locations={[0, 0.55, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: heroFadeHeight }}
          />
          {movie.posterPath && (
            // ⚠️ 크롭된 화면은 잘렸다는 티가 안 나 힌트가 없으면 아무도 안 누른다.
            <View className="absolute bottom-3 right-3 h-7 w-7 items-center justify-center rounded-full bg-black/40">
              <Maximize2 size={14} color={colors.primaryForeground} />
            </View>
          )}
        </View>
      </Pressable>

      <View className="px-4">
        <Spacer size="md" />
        <Txt variant="h2" numberOfLines={2} className="text-center">
          {movie.title}
        </Txt>
        <Spacer size="xs" />
        <Txt variant="caption" color="mutedForeground" className="text-center">
          {[year, movie.runtime ? `${movie.runtime}분` : null].filter(Boolean).join(' · ')}
        </Txt>

        {myRating != null && (
          <>
            <Spacer size="md" />
            <View className="items-center">
              {/* 탭해서 바로 수정 — 대표 기록의 별점을 갱신한다. 기록이 여러 개면
                  대표만 바뀐다(다른 회차의 별점은 그대로). */}
              <RatingStars
                rating={myRating}
                size={40}
                onChange={
                  representativeRecord && !updateRecord.isPending ? handleChangeMyRating : undefined
                }
              />
            </View>
          </>
        )}

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
              {/* ⚠️ 첫 아이템이 스크롤뷰 경계에 딱 붙으면 원형 아바타 왼쪽 끝이 살짝
                  잘려 보인다(실기기 확인) — 약간의 왼쪽 여백으로 해결한다.
                  3px로는 부족해 8px로 늘렸다(2026-09-10 재확인). */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 8 }}>
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
      {/* 히어로에서 크롭된 원본을 그대로 보여준다 — w780을 재사용하므로 추가 다운로드가
          없다(§9.3). Android 뒤로가기는 onRequestClose로 받는다.
          ⚠️ 탭-배경-닫기 대신 명시적 닫기 버튼을 둔다 — 포스터를 자세히 보려는 화면에서
          아무 데나 탭하면 닫히는 게 오히려 불편하다는 실기기 피드백을 반영했다.
          ⚠️ Android는 statusBarTranslucent 없이는 Modal이 상태바 아래부터만 그려져
          최상단이 어두워지지 않는다(갤럭시 실기기 확인) — 켜서 검정 배경이 상태바까지
          덮게 한다. */}
      {posterModalVisible && <StatusBar style="light" />}
      <Modal
        visible={posterModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPosterModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/90">
          {heroUri && (
            <Image
              source={{ uri: heroUri }}
              style={{ width: windowWidth, height: posterNaturalHeight }}
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setPosterModalVisible(false)}
            hitSlop={8}
            accessibilityLabel="닫기"
            className="absolute right-4 h-10 w-10 items-center justify-center rounded-full bg-black/60"
            style={{ top: insets.top + 12 }}
          >
            <X size={22} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </Modal>
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
