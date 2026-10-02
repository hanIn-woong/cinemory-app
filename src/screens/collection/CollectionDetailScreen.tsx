import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreVertical } from 'lucide-react-native';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ActionSheet, EmptyState, ErrorState, InfiniteScrollFooter, LoadingState, type ActionSheetOption } from '../../components/common';
import { CollectionFormModal } from '../../components/collection/CollectionFormModal';
import { SHELF_PADDING_X, ShelfRow, type ShelfPoster } from '../../components/collection/ShelfRow';
import { Screen } from '../../components/primitives';
import { useCollectionMovies, useDeleteCollection } from '../../hooks/useCollection';
import type { MyPageStackParamList } from '../../navigation/types';
import { colors, shelf } from '../../theme/tokens';

type Rt = RouteProp<MyPageStackParamList, 'CollectionDetail'>;
type Nav = NativeStackNavigationProp<MyPageStackParamList, 'CollectionDetail'>;
// 목록 카드(5칸)보다 한 칸 적게 — 상세는 포스터를 눌러 들어가는 화면이라 크게 본다(2026-10-02).
const SLOTS = 4;
// 상단 페이드 — 스크롤하면 포스터가 헤더 아래 선에서 잘려 경계처럼 보였다(2026-10-02). 헤더·벽이 같은 색이라
// 벽 색 → 투명 그라디언트를 위에 깔면 포스터가 헤더 속으로 녹아들어 경계가 사라진다.
const FADE_HEIGHT = 20;
// ⚠️ 'transparent'(투명 검정)로 끝내면 Android 그라디언트 중간이 거무스름해진다 — 벽 색의 알파 0으로 끝낸다.
const WALL_TRANSPARENT = `${shelf.wall}00`;

export function CollectionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { collectionId, title, description } = useRoute<Rt>().params;
  const { width: windowWidth } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const movies = useCollectionMovies(collectionId);

  // 맨 위에서는 페이드를 숨긴다 — 첫 줄 포스터 윗부분을 가리지 않게. 스크롤한 만큼(0 → FADE_HEIGHT) 나타난다.
  // UI 스레드에서 처리해 스크롤마다 리렌더하지 않는다.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, FADE_HEIGHT], [0, 1], 'clamp'),
  }));
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

  // 선반 한 줄 = 4편. 마지막 줄은 덜 차도 빈 칸을 채우지 않는다.
  const rows = useMemo(() => {
    const items = movies.data?.pages.flatMap((p) => p.content) ?? [];
    const result: ShelfPoster[][] = [];
    for (let i = 0; i < items.length; i += SLOTS) {
      result.push(
        items.slice(i, i + SLOTS).map((item) => ({
          key: item.movieId!,
          id: item.movieId!,
          posterPath: item.posterPath,
          // 제목을 그리지 않으므로(2026-10-02) 스크린리더용 이름만 붙인다.
          accessibilityLabel: item.title,
          onPress: () => navigation.navigate('MovieDetail', { movieId: item.movieId! }),
        })),
      );
    }
    return result;
  }, [movies.data, navigation]);

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

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {rows.length === 0 ? (
        <EmptyState title="담긴 영화가 없어요" description="오른쪽 위 메뉴의 '영화 편집'에서 추가해보세요" />
      ) : (
        <View style={{ flex: 1 }}>
          <Animated.FlatList
            data={rows}
            keyExtractor={(row) => String(row[0].key)}
            renderItem={({ item: row }) => (
              <ShelfRow posters={row} slots={SLOTS} posterSize="LIST" estimatedWidth={windowWidth - SHELF_PADDING_X * 2} />
            )}
            // 선반 사이 그림자가 벽 위에 떨어지도록 콘텐츠 영역 전체를 벽으로 칠한다 — 줄이 쌓여 책장으로
            // 읽힌다. 콘텐츠 아래 남는 공간은 화면 바탕 그대로(영화가 적어도 화면이 벽으로 덮이지 않게).
            contentContainerStyle={{ backgroundColor: shelf.wall }}
            onEndReached={() => {
              if (movies.hasNextPage && !movies.isFetchingNextPage) movies.fetchNextPage();
            }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <InfiniteScrollFooter visible={movies.hasNextPage ?? false} loading={movies.isFetchingNextPage} />
            }
          />
          <Animated.View pointerEvents="none" style={[styles.fade, fadeStyle]}>
            <LinearGradient colors={[shelf.wall, WALL_TRANSPARENT]} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
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

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, left: 0, right: 0, height: FADE_HEIGHT },
});
