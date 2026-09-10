import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, List } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AuthRequired, EmptyState, ErrorState, InfiniteScrollFooter, LoadingState } from '../../components/common';
import { MovieGridItem } from '../../components/movie/MovieGridItem';
import { MovieListItem } from '../../components/movie/MovieListItem';
import { Screen } from '../../components/primitives';
import { useCollapsibleToolbar } from '../../hooks/useCollapsibleToolbar';
import { useMyWishes } from '../../hooks/useWishlist';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, layout } from '../../theme/tokens';

// 가장 단순한 2군 화면 — API·훅·무한스크롤·게이트가 이미 다 있어 파이프가 통하는지
// 검증하는 역할이다(M2C-screens-spec.md §5.1). MyRecordsScreen을 구조째 베낀다.
type Nav = NativeStackNavigationProp<MyPageStackParamList, 'Wishlist'>;
type ViewMode = 'grid' | 'list';
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const TOOLBAR_HEIGHT = 44;

export function WishlistScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const { width: windowWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { onScroll, toolbarStyle, reset } = useCollapsibleToolbar(TOOLBAR_HEIGHT);

  // ⚠️ user가 null이면 조회하지 않는다 — 화면 자체가 <AuthRequired>로 막히므로
  // userId ?? 0은 훅에 넘길 더미 값일 뿐, 실제로 이 값으로 조회가 나가지 않는다.
  const wishes = useMyWishes(userId ?? 0);

  // ⚠️ 그리드↔리스트 토글은 FlatList를 key로 재생성한다 — 스크롤은 0으로 가는데 툴바
  // 애니메이션 상태는 그대로라 숨김에 굳는다(§5.5 함정 1). 토글마다 되돌린다.
  useEffect(() => {
    reset();
  }, [viewMode, reset]);

  if (!isAuthed) {
    return <AuthRequired description="찜 목록은 로그인 후 볼 수 있어요" />;
  }

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

  // ⚠️ 네이티브 헤더가 이미 상단 안전영역을 소화한다 — top을 빼서 헤더 밑에 툴바를 바로 붙인다.
  return (
    <Screen padded={false} edges={['left', 'right']}>
      <View className="flex-1 overflow-hidden">
        <Animated.View
          pointerEvents="box-none"
          className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-end bg-background px-4"
          style={[{ height: TOOLBAR_HEIGHT }, toolbarStyle]}
        >
          <Pressable onPress={() => setViewMode('grid')} hitSlop={8} className="mr-4">
            <LayoutGrid size={20} color={viewMode === 'grid' ? colors.primary : colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={() => setViewMode('list')} hitSlop={8}>
            <List size={20} color={viewMode === 'list' ? colors.primary : colors.mutedForeground} />
          </Pressable>
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
            key={viewMode}
            data={items}
            numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
            columnWrapperStyle={viewMode === 'grid' ? { gap: GRID_GAP } : undefined}
            contentContainerStyle={{
              paddingTop: TOOLBAR_HEIGHT,
              paddingHorizontal: viewMode === 'grid' ? 0 : layout.screenPadding,
              // 그리드는 화면 가장자리까지 채우는 게 목적이라 바닥도 예외를 두지 않는다
              // (MyRecordsScreen과 동일, docs/M2C-screens-spec.md·M2B 변경 이력 참고).
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
    </Screen>
  );
}
