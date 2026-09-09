import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLayoutEffect, useState } from 'react';
import { FlatList, Pressable } from 'react-native';
import { AuthRequired, EmptyState, ErrorState, InfiniteScrollFooter, LoadingState } from '../../components/common';
import { CollectionShelfCard } from '../../components/collection/CollectionShelfCard';
import { CollectionFormModal } from '../../components/collection/CollectionFormModal';
import { Screen, Txt } from '../../components/primitives';
import { useMyCollections } from '../../hooks/useCollection';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'CollectionList'>;

export function CollectionListScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const [formVisible, setFormVisible] = useState(false);

  // ⚠️ user가 null이면 조회하지 않는다 — 화면 자체가 <AuthRequired>로 막히므로
  // userId ?? 0은 훅에 넘길 더미 값일 뿐, 실제로 이 값으로 조회가 나가지 않는다.
  const collections = useMyCollections(userId ?? 0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isAuthed ? (
          <Pressable onPress={() => setFormVisible(true)} hitSlop={8}>
            <Txt variant="body" color="primary">
              컬렉션 생성
            </Txt>
          </Pressable>
        ) : null,
    });
  }, [navigation, isAuthed]);

  if (!isAuthed) {
    return <AuthRequired description="내 컬렉션은 로그인 후 볼 수 있어요" />;
  }

  if (collections.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (collections.isError || !collections.data) {
    return (
      <Screen>
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
