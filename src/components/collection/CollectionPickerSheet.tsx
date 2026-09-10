import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Divider, Txt } from '../primitives';
import { useAddMoviesToCollection, useMyCollections } from '../../hooks/useCollection';
import { useAuthStore } from '../../store/authStore';
import type { CollectionResponse } from '../../types';
import { CollectionFormModal } from './CollectionFormModal';

interface CollectionPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  movieId: number;
}

// "컬렉션에 추가" 시트 (M2-B에서 미뤄 둔 것, docs/M2C-screens-spec.md §5.4).
// ⚠️ 게스트 처리는 호출부 책임이다 — MovieDetailScreen이 useRequireAuth()로 감싸 연다.
export function CollectionPickerSheet({ visible, onClose, movieId }: CollectionPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const collections = useMyCollections(userId ?? 0);
  const addMovies = useAddMoviesToCollection();
  const [createVisible, setCreateVisible] = useState(false);

  function addTo(collectionId: number, collectionName: string) {
    addMovies.mutate(
      { collectionId, body: { movieIds: [movieId] } },
      {
        onSuccess: (result) => {
          // ⚠️ 멱등이라 "이미 있음"이 에러로 오지 않는다 — addedCount/skippedCount로 분기해야
          // 사용자가 실제로 담겼는지 알 수 있다.
          if (result.skippedCount && result.skippedCount > 0) {
            Alert.alert(`이미 '${collectionName}'에 있어요`);
          } else {
            Alert.alert(`'${collectionName}'에 담았어요`);
          }
          onClose();
        },
        onError: (error) => Alert.alert('실패', error.message),
      },
    );
  }

  function handleCreated(data: CollectionResponse) {
    // ⚠️ 컬렉션이 0개인 사용자를 막지 않는다 — 만든 직후 그 컬렉션에 바로 담는다.
    // 두 단계로 끊으면 사용자가 시트를 다시 열어야 한다.
    setCreateVisible(false);
    addTo(data.id!, data.name!);
  }

  const items = collections.data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable className="flex-1 bg-black/40" onPress={onClose}>
          <View
            className="mt-auto max-h-[70%] rounded-t-xl bg-card"
            style={{ paddingBottom: insets.bottom }}
            onStartShouldSetResponder={() => true}
          >
            <View className="px-4 py-3">
              <Txt variant="caption" color="mutedForeground">
                컬렉션에 추가
              </Txt>
            </View>

            {collections.isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                onEndReached={() => {
                  if (collections.hasNextPage && !collections.isFetchingNextPage) collections.fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  <View className="px-4 py-3">
                    <Txt variant="body" color="mutedForeground">
                      아직 만든 컬렉션이 없어요
                    </Txt>
                  </View>
                }
                renderItem={({ item, index }) => (
                  <View>
                    {index > 0 && <Divider />}
                    <Pressable
                      className="px-4 py-4"
                      disabled={addMovies.isPending}
                      onPress={() => addTo(item.id!, item.name!)}
                    >
                      <Txt variant="body">{item.name}</Txt>
                      <Txt variant="caption" color="mutedForeground">
                        영화 {item.movieCount ?? 0}편
                      </Txt>
                    </Pressable>
                  </View>
                )}
              />
            )}

            <Divider />
            <Pressable
              className="px-4 py-4"
              onPress={() => {
                onClose();
                setCreateVisible(true);
              }}
            >
              <Txt variant="body" color="primary">
                + 새 컬렉션 만들기
              </Txt>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <CollectionFormModal visible={createVisible} onClose={() => setCreateVisible(false)} onSaved={handleCreated} />
    </>
  );
}
