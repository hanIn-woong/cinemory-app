import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { type CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, List } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FlatList, type ListRenderItemInfo, Pressable, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  EmptyState,
  ErrorState,
  InfiniteScrollFooter,
  LoadingState,
  SortButton,
  SortSheet,
} from '../../components/common';
import { MovieGridItem } from '../../components/movie/MovieGridItem';
import { MovieListItem } from '../../components/movie/MovieListItem';
import { Screen, Txt } from '../../components/primitives';
import { RECORD_SORT_OPTIONS } from '../../constants/librarySort';
import { useCollapsibleToolbar } from '../../hooks/useCollapsibleToolbar';
import { useMyRecords } from '../../hooks/useRecords';
import type { LibraryTabParamList, MyPageStackParamList } from '../../navigation/types';
import { colors, layout } from '../../theme/tokens';
import type { RecordSort, UserMovieListItemResponse } from '../../types';

// 내 서재(MyLibrary)의 '내 기록' 탭. 로그인 게이트는 MyLibraryScreen이 한 번에 한다.
type Nav = CompositeNavigationProp<
  MaterialTopTabNavigationProp<LibraryTabParamList, 'records'>,
  NativeStackNavigationProp<MyPageStackParamList>
>;
type ViewMode = 'grid' | 'list';
const GRID_COLUMNS = 3;
// 그리드는 화면을 꽉 채우는 느낌을 원해서 여백을 최소화한다(리스트는 기존 화면 여백 유지).
const GRID_GAP = 2;
const TOOLBAR_HEIGHT = 44;

interface RecordsTabProps {
  // 소셜의 "남의 서재 보기"로 재사용할 자리 — 목록 주인을 밖에서 받는다(§3.1).
  userId: number;
}

export function RecordsTab({ userId }: RecordsTabProps) {
  const navigation = useNavigation<Nav>();
  const { width: windowWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { onScroll, toolbarStyle, reset, show } = useCollapsibleToolbar(TOOLBAR_HEIGHT);
  // 정렬은 화면 state — 상세에 들어갔다 나와도 스택에 화면이 살아 있어 유지된다
  // (영속화는 하지 않는다, docs/library-sort-spec.md §5).
  const [sort, setSort] = useState<RecordSort>('RECENT');
  const [sortVisible, setSortVisible] = useState(false);
  const listRef = useRef<FlatList<UserMovieListItemResponse>>(null);

  const records = useMyRecords(userId, sort);

  // ⚠️ 그리드↔리스트 토글은 FlatList를 key로 재생성한다 — 스크롤은 0으로 가는데 툴바
  // 애니메이션 상태는 그대로라 숨김에 굳는다(§5.5 함정 1). 토글마다 되돌린다.
  useEffect(() => {
    reset();
  }, [viewMode, reset]);

  // ⚠️ 탭 전환 시 툴바를 강제로 보인다 — 다른 탭에서 숨긴 채 스와이프해 오면 이 탭이
  // 스크롤 0이라 되돌릴 스크롤이 없어 영영 안 보인다(docs/library-sort-spec.md §3.4,
  // M2-B §5.5 함정 3과 같은 구조). 스크롤 위치는 유지하므로 reset()이 아니라 show().
  useFocusEffect(
    useCallback(() => {
      show();
    }, [show]),
  );

  // ⚠️ 정렬 변경 = 리스트 리셋 — 이전 목록이 placeholder로 남아 FlatList가 재생성되지
  // 않으므로 스크롤을 직접 0으로 돌리고, 툴바도 숨김에 굳지 않게 되돌린다
  // (docs/library-sort-spec.md §2.3, M2-B §5.5 함정 1과 같은 부류).
  const changeSort = (next: RecordSort) => {
    setSort(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    reset();
  };

  // 그리드는 화면 가장자리까지 채운다 — 좌우 여백 없이 열 사이 간격만 최소로 둔다.
  const cellWidth = (windowWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  // renderItem을 고정한다 — 인라인이면 페이지가 붙을 때마다(isFetchingNextPage 토글 포함)
  // 마운트된 셀 전부가 새 함수로 다시 그려진다. early return보다 위에 둬야 훅 순서가 유지된다.
  const openMovie = useCallback(
    (movieId: number) => navigation.navigate('MovieDetail', { movieId }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<UserMovieListItemResponse>) =>
      viewMode === 'grid' ? (
        <MovieGridItem
          id={item.movieId!}
          title={item.title!}
          posterPath={item.posterPath}
          width={cellWidth}
          onPress={() => openMovie(item.movieId!)}
        />
      ) : (
        <MovieListItem
          id={item.movieId!}
          title={item.title!}
          posterPath={item.posterPath}
          releaseDate={item.releaseDate}
          subtitle={item.genres?.map((g) => g.name).join(', ')}
          onPress={() => openMovie(item.movieId!)}
        />
      ),
    [viewMode, cellWidth, openMovie],
  );

  if (records.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (records.isError || !records.data) {
    return (
      <Screen>
        <ErrorState message={records.error?.message} onRetry={() => records.refetch()} />
      </Screen>
    );
  }

  const items = records.data.pages.flatMap((p) => p.content);
  // 무한스크롤 첫 페이지의 totalElements를 그대로 쓴다 — 별도 count 조회 없이 이미
  // 받아온 응답으로 충당된다.
  const totalCount = records.data.pages[0]?.totalElements ?? 0;

  // ⚠️ 네이티브 헤더가 이미 상단 안전영역을 소화한다 — 기본 edges(top 포함)를 쓰면
  // SafeAreaView가 그 위에 안전영역 여백을 한 번 더 더해 헤더 구분선과 툴바 사이에
  // 빈 틈이 생긴다. 이 화면은 헤더 바로 밑에 툴바를 붙여야 해서 top을 뺀다.
  return (
    <Screen padded={false} edges={['left', 'right']}>
      <View className="flex-1 overflow-hidden">
        <Animated.View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between bg-background px-4"
          style={[{ height: TOOLBAR_HEIGHT }, toolbarStyle]}
        >
          <View className="flex-row items-center">
            <SortButton options={RECORD_SORT_OPTIONS} value={sort} onPress={() => setSortVisible(true)} />
            <Txt variant="caption" color="mutedForeground" className="ml-3">
              총 {totalCount}편
            </Txt>
          </View>
          <View className="flex-row items-center">
            <Pressable onPress={() => setViewMode('grid')} hitSlop={8} className="mr-4">
              <LayoutGrid size={20} color={viewMode === 'grid' ? colors.primary : colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={() => setViewMode('list')} hitSlop={8}>
              <List size={20} color={viewMode === 'list' ? colors.primary : colors.mutedForeground} />
            </Pressable>
          </View>
        </Animated.View>

        {items.length === 0 ? (
          // ⚠️ 목록이 비면 스크롤이 없다 — 툴바를 고정한다(접기 비활성, §5.5 함정 4).
          // onScroll이 아예 안 붙으니 애니메이션 상태도 초기값(보임)에서 움직이지 않는다.
          <View style={{ paddingTop: TOOLBAR_HEIGHT, flex: 1 }}>
            <EmptyState title="아직 기록이 없어요" description="영화를 검색해서 시청 기록을 남겨보세요" />
          </View>
        ) : (
          <Animated.FlatList
            ref={listRef}
            key={viewMode}
            data={items}
            numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
            columnWrapperStyle={viewMode === 'grid' ? { gap: GRID_GAP } : undefined}
            contentContainerStyle={{
              paddingTop: TOOLBAR_HEIGHT,
              paddingHorizontal: viewMode === 'grid' ? 0 : layout.screenPadding,
              // 그리드는 화면 가장자리까지 채우는 게 목적이라(위 GRID_GAP 주석) 바닥도
              // 예외를 두지 않는다 — 리스트는 마지막 항목이 화면 끝에 붙지 않게 24 유지.
              paddingBottom: viewMode === 'grid' ? 0 : 24,
              gap: viewMode === 'grid' ? GRID_GAP : 0,
            }}
            keyExtractor={(item) => String(item.movieId)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={renderItem}
            // 창 = 이미지 선요청 범위다. 셀이 창에 들어오는 순간 포스터 요청이 나가고, 창 밖으로
            // 나가면 언마운트되며 요청도 취소된다 — 취소되지 않는 Image.prefetch 대신 이 창을
            // 선요청 수단으로 쓴다(2026-09-26 측정 후 결정). 기본 21(위아래 10화면)은 넓어 빠른
            // 스크롤에서 요청이 과하게 쌓이고, 5는 새 페이지 포스터가 늦게 시작됐다 — 위아래 4화면.
            windowSize={9}
            // numColumns가 있으면 단위가 '행'이다 — 그리드 6행 ≈ 첫 화면 + 여유 1행.
            initialNumToRender={viewMode === 'grid' ? 6 : 8}
            onEndReached={() => {
              // ⚠️ cancelRefetch: false — 기본값 true면 진행 중인 요청을 무시하고 매번 새로 부른다.
              // onEndReached가 한 렌더 안에 연달아 불리면 isFetchingNextPage 가드가 갱신되기 전이라
              // 같은 페이지가 두 번 요청됐다(2026-09-26 [perf] 로그에서 확인).
              if (records.hasNextPage && !records.isFetchingNextPage) {
                records.fetchNextPage({ cancelRefetch: false });
              }
            }}
            // 끝에서 2화면 전에 다음 페이지를 부른다 — 데이터가 일찍 와야 셀이 창에 일찍 들어와
            // 포스터 요청도 일찍 시작된다. 0.5면 스피너를 보고 기다리게 된다.
            onEndReachedThreshold={2}
            ListFooterComponent={
              <InfiniteScrollFooter visible={records.hasNextPage ?? false} loading={records.isFetchingNextPage} />
            }
          />
        )}
      </View>

      <SortSheet
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        options={RECORD_SORT_OPTIONS}
        value={sort}
        onChange={changeSort}
      />
    </Screen>
  );
}
