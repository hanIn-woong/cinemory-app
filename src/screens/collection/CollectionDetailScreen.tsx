import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, List, MoreVertical } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ActionSheet, EmptyState, ErrorState, InfiniteScrollFooter, LoadingState, type ActionSheetOption } from '../../components/common';
import { CollectionFormModal } from '../../components/collection/CollectionFormModal';
import { MovieGridItem } from '../../components/movie/MovieGridItem';
import { MovieListItem } from '../../components/movie/MovieListItem';
import { Screen, Txt } from '../../components/primitives';
import { useCollapsibleToolbar } from '../../hooks/useCollapsibleToolbar';
import { useCollectionMovies, useDeleteCollection, useRemoveMovieFromCollection } from '../../hooks/useCollection';
import type { MyPageStackParamList } from '../../navigation/types';
import { colors, layout } from '../../theme/tokens';
import type { CollectionMovieListItemResponse } from '../../types';

type Rt = RouteProp<MyPageStackParamList, 'CollectionDetail'>;
type Nav = NativeStackNavigationProp<MyPageStackParamList, 'CollectionDetail'>;
type ViewMode = 'grid' | 'list';
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const TOOLBAR_HEIGHT = 44;

export function CollectionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { collectionId, title, description } = useRoute<Rt>().params;
  const { width: windowWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const { onScroll, toolbarStyle, reset } = useCollapsibleToolbar(TOOLBAR_HEIGHT);

  const movies = useCollectionMovies(collectionId);
  const deleteCollection = useDeleteCollection();
  const removeMovie = useRemoveMovieFromCollection();

  // ⚠️ 헤더 제목은 라우트 파라미터다 — 수정 성공 후 캐시를 무효화해도 이 값은 저절로 안 바뀐다.
  // navigation.setParams로 파라미터 자체를 갱신해야 여기서도 새 제목을 받는다(§5.3).
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () => (
        <Pressable onPress={() => setMenuVisible(true)} hitSlop={8}>
          <MoreVertical size={22} color={colors.foreground} />
        </Pressable>
      ),
    });
  }, [navigation, title]);

  useEffect(() => {
    reset();
  }, [viewMode, reset]);

  if (movies.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (movies.isError || !movies.data) {
    return (
      <Screen>
        <ErrorState message={movies.error?.message} onRetry={() => movies.refetch()} />
      </Screen>
    );
  }

  const items = movies.data.pages.flatMap((p) => p.content);
  const cellWidth = (windowWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  // ⚠️ 길게 누르기만으로는 발견성이 낮다(실기기 검증에서 확인) — MovieGridItem/MovieListItem의
  // 우상단/우측 제거 버튼과 길게 누르기 둘 다 여기로 이어진다.
  function confirmRemoveMovie(item: CollectionMovieListItemResponse) {
    Alert.alert(item.title ?? '영화', '이 컬렉션에서 제거할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '제거',
        style: 'destructive',
        onPress: () =>
          removeMovie.mutate(
            { collectionId, movieId: item.movieId! },
            { onError: (error) => Alert.alert('실패', error.message) },
          ),
      },
    ]);
  }

  const menuOptions: ActionSheetOption[] = [
    { label: '컬렉션 수정', onPress: () => setEditVisible(true) },
    {
      label: '컬렉션 삭제',
      destructive: true,
      onPress: () =>
        Alert.alert('컬렉션을 삭제할까요?', '이 컬렉션에 담긴 영화 목록도 함께 사라집니다', [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () =>
              deleteCollection.mutate(collectionId, {
                onSuccess: () => navigation.goBack(),
                // ⚠️ 삭제 성공 후 이 화면에 남아 있으면 다음 조회가 COLLECTION_NOT_FOUND로 터진다.
                onError: (error) => Alert.alert('삭제 실패', error.message),
              }),
          },
        ]),
    },
  ];

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {/* 컬렉션 제목 밑 설명 — 접기 대상이 아니다(항상 보인다). 실기기 검증에서 설명이 어디에도
          안 보인다는 지적을 받아 추가했다(§7.1 7번). */}
      {description && (
        <View className="border-b border-border px-4 py-2">
          <Txt variant="caption" color="mutedForeground" numberOfLines={2}>
            {description}
          </Txt>
        </View>
      )}
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
          // ⚠️ C-4 — 빈 컬렉션도 툴바는 고정된 채로 보인다(스크롤이 없어 접기 자체가 안 걸린다).
          <View style={{ paddingTop: TOOLBAR_HEIGHT, flex: 1 }}>
            <EmptyState title="담긴 영화가 없어요" description="영화 상세에서 이 컬렉션에 추가해보세요" />
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
              paddingBottom: 24,
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
                  onLongPress={() => confirmRemoveMovie(item)}
                  onRemove={() => confirmRemoveMovie(item)}
                />
              ) : (
                <MovieListItem
                  id={item.movieId!}
                  title={item.title!}
                  posterPath={item.posterPath}
                  subtitle={[item.releaseYear, item.directorNames].filter(Boolean).join(' · ')}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.movieId! })}
                  onLongPress={() => confirmRemoveMovie(item)}
                  onRemove={() => confirmRemoveMovie(item)}
                />
              )
            }
            onEndReached={() => {
              if (movies.hasNextPage && !movies.isFetchingNextPage) movies.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <InfiniteScrollFooter visible={movies.hasNextPage ?? false} loading={movies.isFetchingNextPage} />
            }
          />
        )}
      </View>

      <ActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)} options={menuOptions} />

      <CollectionFormModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        editing={{ collectionId, name: title, description }}
        onSaved={(data) =>
          navigation.setParams({ title: data.name ?? title, description: data.description ?? undefined })
        }
      />
    </Screen>
  );
}
