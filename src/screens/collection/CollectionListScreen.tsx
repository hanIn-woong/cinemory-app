import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUpDown } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { AuthRequired, EmptyState, ErrorState, InfiniteScrollFooter, LoadingState } from '../../components/common';
import { CollectionReorderRow } from '../../components/collection/CollectionReorderRow';
import { CollectionShelfCard } from '../../components/collection/CollectionShelfCard';
import { CollectionFormModal } from '../../components/collection/CollectionFormModal';
import { ReorderHeaderActions } from '../../components/collection/ReorderHeaderActions';
import { Screen, Txt } from '../../components/primitives';
import { COLLECTION_ORDER_MAX } from '../../constants/collectionOrder';
import { useLoadAllMyCollections, useMyCollections, useReorderCollections } from '../../hooks/useCollection';
import { useReorderMode } from '../../hooks/useReorderMode';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';
import type { CollectionResponse } from '../../types';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'CollectionList'>;

const keyOf = (c: CollectionResponse) => String(c.id);

export function CollectionListScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const [formVisible, setFormVisible] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  // ⚠️ user가 null이면 조회하지 않는다 — 화면 자체가 <AuthRequired>로 막히므로
  // userId ?? 0은 훅에 넘길 더미 값일 뿐, 실제로 이 값으로 조회가 나가지 않는다.
  const collections = useMyCollections(userId ?? 0);
  const loadAll = useLoadAllMyCollections();
  const reorder = useReorderCollections();
  const { editing, order, setOrder, dirty, start, finish } = useReorderMode(keyOf);

  const itemCount = collections.data?.pages[0]?.totalElements ?? 0;

  // 순서 편집 진입 — 무한스크롤 목록이 아니라 전량을 받아 시작한다(docs/collection-order-spec.md §3.2).
  const enterReorder = async () => {
    if (userId == null) return;
    setLoadingAll(true);
    try {
      const all = await loadAll(userId);
      // ⚠️ 상한을 넘으면 저장이 400(부분 저장 없음)이라 진입 자체를 막고 이유를 알린다.
      if (all.length > COLLECTION_ORDER_MAX) {
        Alert.alert('순서를 편집할 수 없어요', `컬렉션이 ${COLLECTION_ORDER_MAX}개를 넘으면 순서 편집을 지원하지 않아요`);
        return;
      }
      start(all);
    } catch (error) {
      Alert.alert('불러오기 실패', (error as Error).message);
    } finally {
      setLoadingAll(false);
    }
  };

  const save = () => {
    if (!dirty) {
      finish();
      return;
    }
    reorder.mutate(order, {
      onSuccess: finish,
      // 낙관적 캐시는 훅이 롤백한다 — 편집을 닫으면 목록이 원래 순서로 보인다(§4.2-8).
      onError: (error) => {
        finish();
        Alert.alert('저장 실패', `원래 순서로 되돌렸어요\n${error.message}`);
      },
    });
  };

  useLayoutEffect(() => {
    if (!isAuthed) {
      navigation.setOptions({ title: '내 컬렉션', headerRight: () => null });
      return;
    }
    if (editing) {
      navigation.setOptions({
        title: '순서 편집',
        headerRight: () => <ReorderHeaderActions saving={reorder.isPending} onCancel={finish} onSave={save} />,
      });
      return;
    }
    navigation.setOptions({
      title: '내 컬렉션',
      headerRight: () => (
        <View className="flex-row items-center">
          {/* 2개 이상일 때만 — 하나뿐이면 바꿀 순서가 없다 */}
          {itemCount >= 2 &&
            (loadingAll ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 16 }} />
            ) : (
              <Pressable onPress={enterReorder} hitSlop={8} className="mr-4" accessibilityLabel="순서 편집">
                <ArrowUpDown size={20} color={colors.foreground} />
              </Pressable>
            ))}
          <Pressable onPress={() => setFormVisible(true)} hitSlop={8}>
            <Txt variant="body" color="primary">
              컬렉션 생성
            </Txt>
          </Pressable>
        </View>
      ),
    });
    // enterReorder·save는 렌더마다 새로 만들어지지만, 그 안에서 읽는 값(userId·order·dirty 등)이
    // 아래 의존성에 모두 들어 있어 헤더가 낡은 클로저를 들고 있지 않는다.
  }, [navigation, isAuthed, editing, reorder.isPending, itemCount, loadingAll, order, dirty, userId]);

  if (!isAuthed) {
    return <AuthRequired description="내 컬렉션은 로그인 후 볼 수 있어요" />;
  }

  if (editing) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        <Animated.ScrollView ref={scrollableRef} contentContainerStyle={{ padding: 16 }}>
          <Txt variant="caption" color="mutedForeground" className="mb-3">
            길게 눌러 끌면 순서를 바꿀 수 있어요
          </Txt>
          <Sortable.Grid
            columns={1}
            rowGap={12}
            data={order}
            keyExtractor={keyOf}
            renderItem={({ item }) => <CollectionReorderRow name={item.name!} movieCount={item.movieCount ?? 0} />}
            onDragEnd={({ data }) => setOrder(data)}
            scrollableRef={scrollableRef}
          />
        </Animated.ScrollView>
      </Screen>
    );
  }

  if (collections.isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (collections.isError || !collections.data) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={collections.error?.message} onRetry={() => collections.refetch()} />
      </Screen>
    );
  }

  const items = collections.data.pages.flatMap((p) => p.content);

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {items.length === 0 ? (
        <EmptyState
          title="아직 만든 컬렉션이 없어요"
          description="영화를 모아 나만의 컬렉션을 만들어보세요"
          action={{ label: '컬렉션 만들기', onPress: () => setFormVisible(true) }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <CollectionShelfCard
              id={item.id!}
              name={item.name!}
              movieCount={item.movieCount ?? 0}
              description={item.description ?? undefined}
              // position ASC 최대 5장. 포스터 없는 영화는 서버가 빼므로 movieCount보다 적을 수
              // 있고, 빈 슬롯은 채우지 않는다(docs/collection-order-spec.md §2).
              posters={item.previewPosterPaths ?? []}
              onPress={() =>
                navigation.navigate('CollectionDetail', {
                  collectionId: item.id!,
                  title: item.name!,
                  description: item.description ?? undefined,
                })
              }
            />
          )}
          onEndReached={() => {
            if (collections.hasNextPage && !collections.isFetchingNextPage) collections.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <InfiniteScrollFooter
              visible={collections.hasNextPage ?? false}
              loading={collections.isFetchingNextPage}
            />
          }
        />
      )}

      <CollectionFormModal visible={formVisible} onClose={() => setFormVisible(false)} />
    </Screen>
  );
}
