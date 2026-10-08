import { useNavigation, usePreventRemove, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { EmptyState, ErrorState, LoadingState } from '../../components/common';
import { CollectionAddMoviesModal, type PickedMovie } from '../../components/collection/CollectionAddMoviesModal';
import { CollectionMovieEditRow } from '../../components/collection/CollectionMovieEditRow';
import { Screen, Txt } from '../../components/primitives';
import { COLLECTION_MOVIE_ORDER_MAX } from '../../constants/collectionOrder';
import {
  useAddMoviesToCollection,
  useCollectionMovies,
  useLoadAllCollectionMovies,
  useRemoveMovieFromCollection,
  useReorderCollectionMovies,
} from '../../hooks/useCollection';
import type { MyPageStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import type { CollectionMovieListItemResponse, PageResponse } from '../../types';

type Rt = RouteProp<MyPageStackParamList, 'CollectionEdit'>;
type Nav = NativeStackNavigationProp<MyPageStackParamList, 'CollectionEdit'>;

// 전환 전에 그리는 행 수 — 100dp 행이라 대부분 기기에서 첫 화면을 채운다. 나머지는 전환이 끝난 뒤 붙인다.
const INITIAL_ROWS = 10;
// 전환 후 프레임마다 붙이는 행 수 — 한 번에 다 붙이면 그 커밋 동안 스크롤이 멈춘다(2026-10-03 실기기).
const ROWS_PER_FRAME = 10;
// transitionEnd가 오지 않는 경우의 안전망(ReportScreen과 같은 값).
const ROWS_READY_FALLBACK_MS = 600;

// 받은 페이지 중 seen에 없는 영화를 서버 순서대로 꺼내고 seen에 기록한다. 첫 렌더 초기화와 페이지 이어 붙이기가 같이 쓴다.
function takeFresh(pages: PageResponse<CollectionMovieListItemResponse>[] | undefined, seen: Set<number>): PickedMovie[] {
  const fresh: PickedMovie[] = [];
  pages?.forEach((p) =>
    p.content.forEach((m) => {
      if (seen.has(m.movieId!)) return;
      seen.add(m.movieId!);
      fresh.push({
        movieId: m.movieId!,
        title: m.title!,
        posterPath: m.posterPath,
        subtitle: [m.releaseYear, m.directorNames].filter(Boolean).join(' · ') || undefined,
      });
    }),
  );
  return fresh;
}

// 컬렉션 상세 ⋮ → "영화 편집"(2026-10-02, docs/M2C-screens-spec.md §5.3-A). 9/10~9/28의 통합 편집 모달에서
// "현재 영화" 탭을 스택 화면으로 옮긴 것 — 모달 안에서는 GestureHandlerRootView를 한 번 더 감싸야 드래그가
// 먹었는데 스택 화면은 App.tsx의 루트가 그대로 닿는다.
// ★ 저장 전까지는 서버를 건드리지 않는다 — 추가(우측 상단 [+] 모달)·삭제·순서 모두 화면에만 반영하고,
// "저장"에서 추가 → 삭제 → 순서 순으로 한 번에 보낸다. 뒤로가기 = 취소(변경이 있으면 묻는다).
// ★ 전량 로드는 진입이 아니라 "저장" 때 한다(2026-10-02). 진입은 상세가 받아 둔 무한스크롤 캐시
// (useCollectionMovies)로 즉시 그리고, 스크롤하면 다음 페이지를 이어 붙인다. 순서 저장 API는 집합 전체를
// 요구하지만, 아직 안 받은 영화는 서버 순서상 항상 받은 것들 **뒤**에 있으므로 저장 때 나머지를 받아
// 원래 순서대로 끝에 붙이면 정확한 전체가 된다(docs/collection-order-spec.md §3.2). 드래그는 받은 범위
// 안에서만 된다 — 맨 아래로 옮기려면 끝까지 스크롤해 받으면 된다.
export function CollectionEditScreen() {
  const navigation = useNavigation<Nav>();
  const { collectionId } = useRoute<Rt>().params;

  const movies = useCollectionMovies(collectionId);
  const loadAllMovies = useLoadAllCollectionMovies();
  const addMovies = useAddMoviesToCollection();
  const removeMovie = useRemoveMovieFromCollection();
  const reorderMovies = useReorderCollectionMovies();

  // ★ 첫 렌더부터 상세가 받아 둔 캐시로 채운다(2026-10-03 — 진입이 느림). 예전에는 빈 배열로 시작해 effect에서
  // 채웠는데, 그러면 전환 애니메이션 중에 빈 프레임(20편 이하면 "담긴 영화가 없어요")을 한 번 그린 뒤 무거운 행
  // 전체를 다시 마운트했다. 이후 도착하는 페이지는 아래 effect가 이어 붙인다.
  const [initial] = useState(() => {
    const seen = new Set<number>();
    const fresh = takeFresh(movies.data?.pages, seen);
    return { seen, ids: fresh.map((m) => m.movieId), catalog: new Map(fresh.map((m) => [m.movieId, m])) };
  });
  // order가 "지금 화면에 보이는 순서"의 단일 출처이고, catalog는 id → 표시 정보.
  // serverIds는 지금까지 받은 페이지의 서버 순서(= 서버 전체 순서의 앞부분).
  const [serverIds, setServerIds] = useState<number[]>(initial.ids);
  const [catalog, setCatalog] = useState<Map<number, PickedMovie>>(initial.catalog);
  const [order, setOrder] = useState<number[]>(initial.ids);
  const [pendingAdd, setPendingAdd] = useState<Map<number, PickedMovie>>(new Map());
  const [pendingRemove, setPendingRemove] = useState<Set<number>>(new Set());
  const [addVisible, setAddVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // 저장 성공 후 나갈 때 아래 이탈 가드에 걸리지 않게 한다.
  const [saved, setSaved] = useState(false);
  // ⚠️ 드래그 중에는 새 페이지를 붙이지 않는다 — 끄는 도중 목록이 늘면 위치 계산이 흔들린다.
  // 드래그 직전에 시작된 요청이 드래그 중에 도착하면, 끝난 뒤(onDragEnd의 setOrder로 order가 바뀌어)
  // 아래 effect가 다시 돌며 붙인다. state가 아니라 ref다 — 드래그 시작 순간에 화면 전체가 리렌더되면
  // 잡은 행이 튄다(2026-10-02 실기기).
  const draggingRef = useRef(false);
  // 한 번 붙인 id — 무한스크롤 캐시가 다시 받아져도(staleTime·무효화) 중복으로 붙이지 않는다.
  const seenRef = useRef<Set<number>>(initial.seen);

  // ★ 전환 전에는 앞 INITIAL_ROWS개만 그린다(2026-10-03 — 탭 후 화면이 밀려 들어오기 전에 멈춤). 행이 첫 렌더에
  // 들어가 navigate 커밋이 행 N개의 마운트를 끝내야 전환이 시작됐다. order·serverIds는 처음부터 전량이라 저장
  // 계산은 그대로이고, 그리는 범위만 자른다. 잘린 동안은 드래그를 끈다 — onDragEnd의 data가 잘린 배열이라
  // setOrder하면 뒷부분이 사라진다(전환 중이라 실제로 잡을 수는 없지만 막아 둔다).
  // ★ 전환 뒤에도 한 번에 붙이지 않고 프레임마다 ROWS_PER_FRAME개씩 늘린다(2026-10-03 — 전환 직후 스크롤하면
  // 나머지 행 마운트 동안 멈췄다가 리스트가 나왔다). 스크롤로 다음 페이지가 도착해도 같은 경로로 나눠 붙는다.
  const [transitioned, setTransitioned] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd', (e) => {
      if (!e.data.closing) setTransitioned(true);
    });
    const fallback = setTimeout(() => setTransitioned(true), ROWS_READY_FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation]);
  const allShown = visibleCount >= order.length;
  useEffect(() => {
    if (!transitioned || allShown) return;
    const frame = requestAnimationFrame(() => setVisibleCount((c) => c + ROWS_PER_FRAME));
    return () => cancelAnimationFrame(frame);
  }, [transitioned, allShown, visibleCount]);
  const visibleOrder = allShown ? order : order.slice(0, visibleCount);

  const scrollableRef = useAnimatedRef<Animated.ScrollView>();
  const openRowRef = useRef<SwipeableMethods | null>(null);

  const pages = movies.data?.pages;
  // 서버 상한(500)을 넘으면 순서 저장이 400이라 드래그를 끈다. 추가·삭제는 그대로 된다.
  const tooManyToSort = (pages?.[0]?.totalElements ?? 0) > COLLECTION_MOVIE_ORDER_MAX;

  // 받은 페이지 중 아직 안 붙인 영화를 끝에 붙인다. 새로 받은 것은 서버 순서상 이미 받은 것들 뒤다.
  useEffect(() => {
    if (!pages || draggingRef.current) return;
    const fresh = takeFresh(pages, seenRef.current);
    if (fresh.length === 0) return;
    const ids = fresh.map((m) => m.movieId);
    setServerIds((prev) => [...prev, ...ids]);
    setOrder((prev) => [...prev, ...ids]);
    setCatalog((prev) => {
      const next = new Map(prev);
      fresh.forEach((m) => next.set(m.movieId, m));
      return next;
    });
  }, [pages, order]);

  function loadMoreIfNearEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - layoutMeasurement.height * 0.5;
    // 잘린 동안은 콘텐츠가 짧아 "끝 근처"로 오판한다 — 전량을 그린 뒤에만 다음 페이지를 받는다.
    if (nearEnd && allShown && !draggingRef.current && movies.hasNextPage && !movies.isFetchingNextPage) movies.fetchNextPage({ cancelRefetch: false });
  }

  // 서버가 저장 후 스스로 만들 순서 — 새로 담은 것 맨 위(나중에 고른 것이 위) + 남은 기존 순서.
  // 화면 순서가 이것과 같으면 순서 저장을 보내지 않는다.
  const serverWouldBe = [
    ...Array.from(pendingAdd.keys()).reverse(),
    ...serverIds.filter((id) => !pendingRemove.has(id)),
  ];
  const reordered = order.length !== serverWouldBe.length || order.some((id, i) => id !== serverWouldBe[i]);
  const dirty = pendingAdd.size > 0 || pendingRemove.size > 0 || reordered;

  usePreventRemove(dirty && !saved, ({ data }) => {
    Alert.alert('저장하지 않은 변경이 있어요', '저장하지 않고 나가면 변경이 사라집니다', [
      { text: '계속 편집', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    if (saved) navigation.goBack();
  }, [saved, navigation]);

  function stageAdd(movie: PickedMovie) {
    // ⚠️ 아직 안 받은 페이지에 이미 있는 영화일 수 있다("담김"은 받은 범위만 안다) — seen에 넣어 두지 않으면
    // 그 페이지가 도착할 때 한 번 더 붙어 키가 중복된다. 서버는 skippedCount로 넘기고, 순서는 저장 시 맨 위로 간다.
    seenRef.current.add(movie.movieId);
    setCatalog((prev) => new Map(prev).set(movie.movieId, movie));
    // ⚠️ 맨 앞에 둔다 — 서버가 새로 담은 영화를 요청 순서대로 MIN-1, MIN-2…로 넣어 "나중에 고른 것이
    // 맨 위"가 된다(백엔드 4-5-A). 끝에 두면 저장 전 화면과 저장 후 순서가 달라진다.
    setOrder((prev) => [movie.movieId, ...prev]);
    if (pendingRemove.has(movie.movieId)) {
      // 이번 편집에서 뺐다가 다시 담는 경우 — 원래 있던 것이니 삭제 대기만 취소한다.
      setPendingRemove((prev) => {
        const next = new Set(prev);
        next.delete(movie.movieId);
        return next;
      });
      return;
    }
    setPendingAdd((prev) => new Map(prev).set(movie.movieId, movie));
  }

  function stageRemove(movieId: number) {
    openRowRef.current = null;
    setOrder((prev) => prev.filter((id) => id !== movieId));
    if (pendingAdd.has(movieId)) {
      // 이번 편집에서 새로 담은 것이면 서버에 없으니 추가 대기만 취소한다.
      setPendingAdd((prev) => {
        const next = new Map(prev);
        next.delete(movieId);
        return next;
      });
      return;
    }
    setPendingRemove((prev) => new Set(prev).add(movieId));
  }

  // ★ renderItem을 고정한다(2026-10-03 — 진입이 느림). sortables는 renderItem identity가 바뀌면 모든 행을 다시
  // 렌더하는데(ItemsProvider store), 인라인이면 삭제·드래그 종료·페이지 추가 등 화면 상태가 바뀔 때마다 전체 행이
  // 다시 그려졌다. stageRemove는 대기 상태를 읽어 렌더마다 바뀌므로 최신본을 ref로 가리켜 콜백을 고정하고,
  // catalog가 바뀌어(페이지 추가·담기) renderItem이 새로 만들어져도 행은 memo라 props가 같으면 건너뛴다.
  const stageRemoveRef = useRef(stageRemove);
  stageRemoveRef.current = stageRemove;
  const handleRemove = useCallback((movieId: number) => stageRemoveRef.current(movieId), []);
  const handleWillOpen = useCallback((methods: SwipeableMethods) => {
    if (openRowRef.current && openRowRef.current !== methods) openRowRef.current.close();
    openRowRef.current = methods;
  }, []);
  const renderItem = useCallback(
    ({ item: movieId }: { item: number }) => {
      const movie = catalog.get(movieId);
      return (
        <CollectionMovieEditRow
          id={movieId}
          title={movie?.title ?? ''}
          posterPath={movie?.posterPath}
          subtitle={movie?.subtitle}
          sortable={!tooManyToSort}
          onRemove={handleRemove}
          onWillOpen={handleWillOpen}
        />
      );
    },
    [catalog, tooManyToSort, handleRemove, handleWillOpen],
  );

  async function handleSave() {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    setIsSaving(true);
    try {
      if (pendingAdd.size > 0) {
        await addMovies.mutateAsync({ collectionId, body: { movieIds: Array.from(pendingAdd.keys()) } });
      }
      // ⚠️ 삭제는 벌크 엔드포인트가 없다 — 한 편씩 호출한다.
      if (pendingRemove.size > 0) {
        await Promise.all(Array.from(pendingRemove).map((movieId) => removeMovie.mutateAsync({ collectionId, movieId })));
      }
      // 순서는 추가·삭제가 끝난 뒤 보낸다 — 서버가 집합 일치를 요구하므로 최종 집합이어야 한다.
      // 전량은 여기서 처음 받는다: 추가·삭제가 반영된 서버 목록 중 화면에 없는 것(= 아직 안 받은 뒷부분)을
      // 서버 순서 그대로 끝에 붙인다. 순서를 안 바꿨으면 이 요청 자체를 하지 않는다.
      if (reordered && !tooManyToSort) {
        const all = await loadAllMovies(collectionId);
        const shown = new Set(order);
        const tail = all.map((m) => m.movieId!).filter((id) => !shown.has(id));
        await reorderMovies.mutateAsync({ collectionId, movieIds: [...order, ...tail] });
      }
      setSaved(true);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요');
    } finally {
      setIsSaving(false);
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '영화 편집',
      headerRight: () =>
        !pages ? null : (
          <View className="flex-row items-center">
            <Pressable
              onPress={() => setAddVisible(true)}
              disabled={isSaving}
              hitSlop={8}
              className="mr-4"
              accessibilityLabel="영화 추가"
            >
              <Plus size={22} color={colors.foreground} />
            </Pressable>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Pressable onPress={handleSave} hitSlop={8}>
                <Txt variant="body" color="primary">
                  저장
                </Txt>
              </Pressable>
            )}
          </View>
        ),
    });
    // handleSave는 렌더마다 새로 만들어지지만, 그 안에서 읽는 상태가 바뀌면 이 effect도 다시 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, pages, isSaving, order, pendingAdd, pendingRemove, dirty]);

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {movies.isLoading ? (
        <LoadingState />
      ) : movies.isError || !pages ? (
        <ErrorState message={movies.error?.message} onRetry={() => movies.refetch()} />
      ) : order.length === 0 && !movies.hasNextPage ? (
        <EmptyState
          title="담긴 영화가 없어요"
          description="오른쪽 위 + 로 영화를 추가해보세요"
          action={{ label: '영화 추가', onPress: () => setAddVisible(true) }}
        />
      ) : (
        // ★ 잡은 행을 ScrollView 밖 오버레이로 옮겨(teleport) 손가락의 화면 좌표로 바로 그린다(2026-10-02 실기기 —
        // 자동 스크롤로 아래 행이 새로 드러날 때마다 잡은 행이 위아래로 튀었다). 행이 콘텐츠 안에 있으면 Android의
        // 애니메이션 scrollTo가 콘텐츠와 함께 행을 먼저 옮기고, 스크롤 오프셋 보정은 한두 프레임 늦게 와서 걸음마다
        // 갔다가 돌아온다. 포털에서는 위치가 touch.absoluteX/Y 기준이라 스크롤과 무관하다.
        <Sortable.PortalProvider enabled>
        <Animated.ScrollView
          ref={scrollableRef}
          contentContainerStyle={{ paddingVertical: 8 }}
          onScroll={loadMoreIfNearEnd}
          scrollEventThrottle={100}
          // ⚠️ Android 12+의 늘어나는(stretch) 오버스크롤을 끈다 — 드래그 자동 스크롤이 끝에 닿으면 콘텐츠가
          // 시각적으로 늘어나는데 터치 좌표는 그대로라, 맨 아래에서 손가락과 잡은 행이 어긋났다(2026-10-02 실기기).
          overScrollMode="never"
        >
          <Txt variant="caption" color="mutedForeground" className="mb-1 px-4">
            {tooManyToSort
              ? `${COLLECTION_MOVIE_ORDER_MAX}편이 넘어 순서 편집은 지원하지 않아요`
              : '앞의 5편이 컬렉션 카드에 보여요'}
          </Txt>
          <Sortable.Grid
            columns={1}
            data={visibleOrder}
            keyExtractor={String}
            // ≡ 핸들로만 끈다 — 잡는 즉시 끌리도록 활성화 지연을 없앤다(기본은 길게 누르기용 지연).
            customHandle
            dragActivationDelay={0}
            // 잡은 행이 튀지 않게 라이브러리 기본값을 리스트에 맞춘다(2026-10-02 실기기) —
            // ① 확대 1.1은 화면 폭 행이 좌우로 넘친다 → 살짝만 ② 스냅은 핸들 중심을 손가락 아래로 끌어와
            // 잡는 순간 행이 밀린다 → 끔(잡은 자리 그대로) ③ 가로 이탈은 리스트에 의미가 없다 → 세로만.
            activeItemScale={1.03}
            // ★ 나머지 행을 흐리게 하지 않는다(기본 0.5, 2026-10-02 실기기 — 행을 지나칠 때 프레임 드랍 + 잡는 순간
            // 포스터 튐). Android는 반투명 뷰(이미지·텍스트·아이콘)를 오프스크린 레이어로 따로 합성해, 흐려진 행 N개가
            // 드래그 내내 매 프레임 다시 합성됐다. 잡는 순간엔 N개의 페이드 애니메이션이 포털 마운트와 같은 프레임에 겹쳤다.
            inactiveItemOpacity={1}
            enableActiveItemSnap={false}
            overDrag="vertical"
            // 자동 스크롤(2026-10-02 실기기 — 드래그하며 스크롤될 때 튐):
            // ① Android(새 아키텍처) 기본은 300ms마다 애니메이션 scrollTo 한 번이라 최고 속도(1000px/s)에서
            //    0.3초마다 ~300px 계단이 졌다. ⚠️ 간격을 줄이면 안 된다 — 100ms로 줄였더니 새 scrollTo가 이전
            //    애니메이션을 중간에 끊어 오프셋이 출렁이고 리스트 전체가 떨렸다(라이브러리가 #463에서 피한 것).
            //    간격은 기본값 그대로 두고 속도 상한만 조정한다. 500은 느리고 800도 부족해 라이브러리 기본값과 같은
            //    1000(한 계단 ~300px) — 잡은 행은 위 PortalProvider로 스크롤과 무관해져 계단이 행을 흔들지 않는다.
            // ② 끝에서 50px 더 넘겨 스크롤하는 기본값을 0으로 — 위 overScrollMode와 함께 맨 아래 어긋남의 원인.
            // ③ 그래도 남은 "끊김"은 프레임 드랍이 아니라 박자였다(2026-10-02): Android 애니메이션 scrollTo는 250ms
            //    가감속(ReactScrollViewHelper, OverScroller 기본)이라 300ms 간격이면 걸음마다 가속 → 정지 → 50ms 멈춤이
            //    초당 3번 반복된다. 라이브러리가 Android에서 매 프레임·비애니메이션 스크롤을 피한 이유(#463 "shaky")는
            //    잡은 행이 콘텐츠 안에서 오프셋 보정을 한 프레임 늦게 받던 것인데, 위 PortalProvider로 잡은 행이 손가락
            //    화면 좌표만 따르게 되어 그 원인이 사라졌다 → iOS와 같은 매 프레임(0)·비애니메이션으로 일정 속도.
            //    ⚠️ 이게 떨리면 되돌릴 곳은 100ms(애니메이션 중간 끊김 — 확인된 실패)가 아니라 기본값(300·animated)이다.
            autoScrollInterval={0}
            animateScrollTo={false}
            autoScrollMaxVelocity={1000}
            autoScrollMaxOverscroll={0}
            sortEnabled={!tooManyToSort && allShown}
            onDragStart={() => {
              draggingRef.current = true;
              openRowRef.current?.close();
              openRowRef.current = null;
            }}
            onDragEnd={({ data }) => {
              draggingRef.current = false;
              setOrder(data);
            }}
            scrollableRef={scrollableRef}
            renderItem={renderItem}
          />
          {/* 받는 중이거나, 받은 행을 아직 나눠 붙이는 중 — 빠르게 끝까지 내려가면 덜 붙은 구간이 보인다 */}
          {(movies.isFetchingNextPage || !allShown) && <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}
        </Animated.ScrollView>
        </Sortable.PortalProvider>
      )}

      <CollectionAddMoviesModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        existingIds={new Set(order)}
        onPick={stageAdd}
      />
    </Screen>
  );
}
