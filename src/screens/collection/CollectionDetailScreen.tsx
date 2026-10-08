import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreVertical } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ActionSheet, EmptyState, ErrorState, LoadingState, type ActionSheetOption } from '../../components/common';
import { CollectionFormModal } from '../../components/collection/CollectionFormModal';
import {
  SHELF_PADDING_X,
  SHELF_POSTER_GAP,
  SHELF_ROW_CHROME,
  SHELF_WALL_PADDING_TOP,
  ShelfRow,
  type ShelfPoster,
} from '../../components/collection/ShelfRow';
import { Screen, Txt } from '../../components/primitives';
import { COLLECTION_MOVIES_PAGE_SIZE, useCollectionMovies, useDeleteCollection } from '../../hooks/useCollection';
import type { MyPageStackParamList } from '../../navigation/types';
import type { CollectionMovieListItemResponse } from '../../types';
import { colors, shelf } from '../../theme/tokens';

type Rt = RouteProp<MyPageStackParamList, 'CollectionDetail'>;
type Nav = NativeStackNavigationProp<MyPageStackParamList, 'CollectionDetail'>;

// 한 화면 페이지 = 5열 × 4행 = 서버 한 페이지(COLLECTION_MOVIES_PAGE_SIZE)(2026-10-03). 화면 N쪽이 곧 서버 N페이지라
// 다시 묶을 필요가 없다 — 열·행을 바꾸면 페이지 크기도 같이 바꿔야 한다.
const COLUMNS = 5;
const ROWS = 4;
// 페이지 번호(`2 / 5`) 자리. 1쪽뿐이어도 비워 두어 페이지 수가 바뀔 때 포스터 크기가 튀지 않게 한다.
const INDICATOR_HEIGHT = 36;

// 화면 페이지 하나. movies가 null이면 아직 안 받은 다음 페이지 자리(넘겨 오면 스피너).
interface PagerItem {
  key: string;
  movies: CollectionMovieListItemResponse[] | null;
}

export function CollectionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { collectionId, title, description } = useRoute<Rt>().params;
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  // 페이지 영역의 실측 크기 — 이것으로 4줄이 높이에 들어가는 포스터 크기를 정한다.
  const [pagerSize, setPagerSize] = useState<{ width: number; height: number } | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const movies = useCollectionMovies(collectionId);

  const deleteCollection = useDeleteCollection();

  // ⚠️ 헤더 제목은 라우트 파라미터다 — 수정 성공 후 캐시를 무효화해도 이 값은 저절로 안 바뀐다.
  // navigation.setParams로 파라미터 자체를 갱신해야 여기서도 새 제목을 받는다(§5.3).
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      // 헤더를 벽 색으로 — 책장 벽이 헤더까지 이어져 보이게 한다(2026-10-02). 경계선도 지운다.
      headerStyle: { backgroundColor: shelf.wall },
      headerTintColor: colors.primaryForeground,
      headerShadowVisible: false,
      headerRight: () => (
        <Pressable onPress={() => setMenuVisible(true)} hitSlop={8}>
          <MoreVertical size={22} color={colors.primaryForeground} />
        </Pressable>
      ),
    });
  }, [navigation, title]);

  function toPosters(items: CollectionMovieListItemResponse[]): ShelfPoster[] {
    return items.map((item) => ({
      key: item.movieId!,
      id: item.movieId!,
      posterPath: item.posterPath,
      // 제목을 그리지 않으므로(2026-10-02) 스크린리더용 이름만 붙인다.
      accessibilityLabel: item.title,
      onPress: () => navigation.navigate('MovieDetail', { movieId: item.movieId! }),
    }));
  }

  // 넘긴 뒤 멈춘 쪽을 현재 페이지로 — 받아 둔 마지막 페이지에 닿으면 다음 페이지를 미리 받아, 넘겼을 때
  // 대부분 이미 차 있게 한다.
  function handlePageSettled(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!pagerSize) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / pagerSize.width);
    setPageIndex(index);
    const loaded = movies.data?.pages.length ?? 0;
    if (index >= loaded - 1 && movies.hasNextPage && !movies.isFetchingNextPage) movies.fetchNextPage({ cancelRefetch: false });
  }

  if (movies.isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (movies.isError || !movies.data) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={movies.error?.message} onRetry={() => movies.refetch()} />
      </Screen>
    );
  }

  const menuOptions: ActionSheetOption[] = [
    // 이름·설명과 영화 편집을 나눈다(2026-10-02, docs/M2C-screens-spec.md §5.3-A) — 이름·설명은 작은 폼
    // 모달에서 바로 저장하고, 영화 추가·삭제·순서는 별도 화면에서 모아 저장한다. 한 화면에 섞으면
    // 저장 버튼이 둘이 되거나(취소해도 이름은 이미 바뀜) [+] 안에 이름 수정이 숨는다.
    { label: '이름·설명 수정', onPress: () => setEditVisible(true) },
    { label: '영화 편집', onPress: () => navigation.navigate('CollectionEdit', { collectionId }) },
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

  const pages = movies.data.pages;
  // 가장 최근에 받은 페이지의 총 개수 — 편집 후 재조회로 바뀔 수 있다.
  const totalElements = pages[pages.length - 1]?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / COLLECTION_MOVIES_PAGE_SIZE));
  const pagerItems: PagerItem[] = [
    ...pages.map((p, i) => ({ key: String(i), movies: p.content })),
    ...(movies.hasNextPage ? [{ key: 'next', movies: null }] : []),
  ];

  // ★ 4줄이 페이지 높이에 들어가도록 포스터 크기를 정한다(2026-10-03) — 폭 기준(5등분)과 높이 기준(4등분 − 선반
  // 장식) 중 작은 쪽. 지금 실기기는 폭 기준으로 들어가고, 키가 작은 기기에서만 높이 기준으로 줄어든다.
  // 폭 기준으로 정해지면 4줄 아래에 높이가 남는다 — 남는 높이를 줄마다 나눠 포스터 위 벽에 더해 페이지를 꽉
  // 채운다(2026-10-03 실기기, 5칸이 되며 아래가 비었다). 포스터를 세로로 늘리면 2:3이 깨져 그림이 잘리므로
  // 늘리는 것은 선반 칸 높이다.
  let posterWidth = 0;
  let wallPaddingTop = SHELF_WALL_PADDING_TOP;
  if (pagerSize) {
    const byWidth = (pagerSize.width - SHELF_PADDING_X * 2 - SHELF_POSTER_GAP * (COLUMNS - 1)) / COLUMNS;
    const byHeight = (pagerSize.height / ROWS - SHELF_ROW_CHROME) / 1.5;
    posterWidth = Math.floor(Math.min(byWidth, byHeight));
    const spare = pagerSize.height - ROWS * (posterWidth * 1.5 + SHELF_ROW_CHROME);
    wallPaddingTop += Math.max(0, Math.floor(spare / ROWS));
  }

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {totalElements === 0 ? (
        <EmptyState title="담긴 영화가 없어요" description="오른쪽 위 메뉴의 '영화 편집'에서 추가해보세요" />
      ) : (
        <>
          <View
            style={{ flex: 1, backgroundColor: shelf.wall }}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setPagerSize((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
            }}
          >
            {pagerSize && (
              <FlatList
                data={pagerItems}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                getItemLayout={(_, index) => ({ length: pagerSize.width, offset: pagerSize.width * index, index })}
                // 한 페이지에 포스터 20장 + 그라디언트 — 양옆 한 쪽씩만 미리 그린다.
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                windowSize={3}
                onMomentumScrollEnd={handlePageSettled}
                renderItem={({ item }) => (
                  <View style={{ width: pagerSize.width, height: pagerSize.height }}>
                    {/* 4줄 자리를 언제나 그린다 — 덜 찬 페이지는 빈 줄이 선반과 벽만 남는다(2026-10-03 사용자 결정).
                        포스터 칸은 채우지 않는다(§5.2 원칙). 줄 묶음을 벽으로 칠해 선반 사이 그림자가 벽 위에
                        떨어진다. 남는 높이는 줄마다 벽에 나눠 넣고, 반올림으로 남는 몇 px도 페이지 영역 바탕(벽 색)이라 티가 안 난다. */}
                    <View style={{ backgroundColor: shelf.wall }}>
                      {Array.from({ length: ROWS }, (_, row) => (
                        <ShelfRow
                          key={row}
                          posters={toPosters(item.movies?.slice(row * COLUMNS, (row + 1) * COLUMNS) ?? [])}
                          slots={COLUMNS}
                          posterWidth={posterWidth}
                          wallPaddingTop={wallPaddingTop}
                          estimatedWidth={pagerSize.width - SHELF_PADDING_X * 2}
                        />
                      ))}
                    </View>
                    {item.movies === null && (
                      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
                        <ActivityIndicator color={colors.primary} />
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
          {/* 벽 색으로 칠해 헤더 → 선반 → 페이지 번호까지 한 면으로 잇는다(2026-10-03). 글자는 헤더와 같은 흰색. */}
          <View
            style={{ height: INDICATOR_HEIGHT, backgroundColor: shelf.wall }}
            className="items-center justify-center"
          >
            {totalPages > 1 && (
              <Txt variant="caption" color="primaryForeground">
                {`${Math.min(pageIndex, totalPages - 1) + 1} / ${totalPages}`}
              </Txt>
            )}
          </View>
        </>
      )}

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
