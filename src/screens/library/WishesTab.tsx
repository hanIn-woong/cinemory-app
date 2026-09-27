import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { type CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, List } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type FlatList, Pressable, useWindowDimensions, View } from 'react-native';
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
import { WISH_SORT_OPTIONS } from '../../constants/librarySort';
import { useCollapsibleToolbar } from '../../hooks/useCollapsibleToolbar';
import { useMyWishes } from '../../hooks/useWishlist';
import type { LibraryTabParamList, MyPageStackParamList } from '../../navigation/types';
import { colors, layout } from '../../theme/tokens';
import type { WishListItemResponse, WishSort } from '../../types';

// 내 서재(MyLibrary)의 '찜 목록' 탭. 로그인 게이트는 MyLibraryScreen이 한 번에 한다.
// RecordsTab과 구조가 같다(M2C-screens-spec.md §5.1에서 MyRecordsScreen을 구조째 베낀 화면).
type Nav = CompositeNavigationProp<
  MaterialTopTabNavigationProp<LibraryTabParamList, 'wishes'>,
  NativeStackNavigationProp<MyPageStackParamList>
>;
type ViewMode = 'grid' | 'list';
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const TOOLBAR_HEIGHT = 44;

interface WishesTabProps {
  // 소셜의 "남의 서재 보기"로 재사용할 자리 — 목록 주인을 밖에서 받는다(§3.1).
  userId: number;
}

export function WishesTab({ userId }: WishesTabProps) {
  const navigation = useNavigation<Nav>();
  const { width: windowWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { onScroll, toolbarStyle, reset, show } = useCollapsibleToolbar(TOOLBAR_HEIGHT);
  // 정렬은 화면 state — 상세에 들어갔다 나와도 스택에 화면이 살아 있어 유지된다
  // (영속화는 하지 않는다, docs/library-sort-spec.md §5).
  const [sort, setSort] = useState<WishSort>('RECENT');
  const [sortVisible, setSortVisible] = useState(false);
  const listRef = useRef<FlatList<WishListItemResponse>>(null);

  const wishes = useMyWishes(userId, sort);

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
  const changeSort = (next: WishSort) => {
    setSort(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    reset();
  };

  if (wishes.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (wishes.isError || !wishes.data) {
    return (
      <Screen>
        <ErrorState message={wishes.error?.message} onRetry={() => wishes.refetch()} />
      </Screen>
    );
  }

  const items = wishes.data.pages.flatMap((p) => p.content);
  const cellWidth = (windowWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  // 무한스크롤 첫 페이지의 totalElements를 그대로 쓴다 — 별도 count 조회 없이 이미
  // 받아온 응답으로 충당된다.
  const totalCount = wishes.data.pages[0]?.totalElements ?? 0;

  // ⚠️ 네이티브 헤더가 이미 상단 안전영역을 소화한다 — top을 빼서 헤더 밑에 툴바를 바로 붙인다.
  return (
    <Screen padded={false} edges={['left', 'right']}>
      <View className="flex-1 overflow-hidden">
        <Animated.View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between bg-background px-4"
          style={[{ height: TOOLBAR_HEIGHT }, toolbarStyle]}
        >
          <View className="flex-row items-center">
            <SortButton options={WISH_SORT_OPTIONS} value={sort} onPress={() => setSortVisible(true)} />
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
          <View style={{ paddingTop: TOOLBAR_HEIGHT, flex: 1 }}>
            <EmptyState
              title="찜한 작품이 없어요"
              description="마음에 드는 영화를 찜해보세요"
              action={{ label: '검색하러 가기', onPress: () => navigation.getParent()?.navigate('HomeTab') }}
            />
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
              // 그리드는 화면 가장자리까지 채우는 게 목적이라 바닥도 예외를 두지 않는다
              // (RecordsTab과 동일, docs/M2C-screens-spec.md·M2B 변경 이력 참고).
              paddingBottom: viewMode === 'grid' ? 0 : 24,
              gap: viewMode === 'grid' ? GRID_GAP : 0,
            }}
            keyExtractor={(item) => String(item.movieId)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) =>
              viewMode === 'grid' ? (
                <MovieGridItem
                  id={item.movieId!}
                  title={item.title!}
                  posterPath={item.posterPath}
                  width={cellWidth}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId! })}
                />
              ) : (
                <MovieListItem
                  id={item.movieId!}
                  title={item.title!}
                  posterPath={item.posterPath}
                  releaseDate={item.releaseDate}
                  subtitle={item.genres?.map((g) => g.name).join(', ')}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId! })}
                />
              )
            }
            onEndReached={() => {
              if (wishes.hasNextPage && !wishes.isFetchingNextPage) wishes.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <InfiniteScrollFooter visible={wishes.hasNextPage ?? false} loading={wishes.isFetchingNextPage} />
            }
          />
        )}
      </View>

      <SortSheet
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        options={WISH_SORT_OPTIONS}
        value={sort}
        onChange={changeSort}
      />
    </Screen>
  );
}
