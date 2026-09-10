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
import { useMyRecords } from '../../hooks/useRecords';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, layout } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'MyRecords'>;
type ViewMode = 'grid' | 'list';
const GRID_COLUMNS = 3;
// 그리드는 화면을 꽉 채우는 느낌을 원해서 여백을 최소화한다(리스트는 기존 화면 여백 유지).
const GRID_GAP = 2;
const TOOLBAR_HEIGHT = 44;

export function MyRecordsScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const { width: windowWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { onScroll, toolbarStyle, reset } = useCollapsibleToolbar(TOOLBAR_HEIGHT);

  // ⚠️ user가 null이면 조회하지 않는다 — 화면 자체가 <AuthRequired>로 막히므로
  // userId ?? 0은 훅에 넘길 더미 값일 뿐, 실제로 이 값으로 조회가 나가지 않는다.
  const records = useMyRecords(userId ?? 0);

  // ⚠️ 그리드↔리스트 토글은 FlatList를 key로 재생성한다 — 스크롤은 0으로 가는데 툴바
  // 애니메이션 상태는 그대로라 숨김에 굳는다(§5.5 함정 1). 토글마다 되돌린다.
  useEffect(() => {
    reset();
  }, [viewMode, reset]);

  if (!isAuthed) {
    return <AuthRequired description="내 기록은 로그인 후 볼 수 있어요" />;
  }

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
  // 그리드는 화면 가장자리까지 채운다 — 좌우 여백 없이 열 사이 간격만 최소로 둔다.
  const cellWidth = (windowWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  // ⚠️ 네이티브 헤더가 이미 상단 안전영역을 소화한다 — 기본 edges(top 포함)를 쓰면
  // SafeAreaView가 그 위에 안전영역 여백을 한 번 더 더해 헤더 구분선과 툴바 사이에
  // 빈 틈이 생긴다. 이 화면은 헤더 바로 밑에 툴바를 붙여야 해서 top을 뺀다.
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
          // onScroll이 아예 안 붙으니 애니메이션 상태도 초기값(보임)에서 움직이지 않는다.
          <View style={{ paddingTop: TOOLBAR_HEIGHT, flex: 1 }}>
            <EmptyState title="아직 기록이 없어요" description="영화를 검색해서 시청 기록을 남겨보세요" />
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
              // 그리드는 화면 가장자리까지 채우는 게 목적이라(위 GRID_GAP 주석) 바닥도
              // 예외를 두지 않는다 — 리스트는 마지막 항목이 화면 끝에 붙지 않게 24 유지.
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
              if (records.hasNextPage && !records.isFetchingNextPage) records.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <InfiniteScrollFooter visible={records.hasNextPage ?? false} loading={records.isFetchingNextPage} />
            }
          />
        )}
      </View>
    </Screen>
  );
}
