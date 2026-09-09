import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { EmptyState, ErrorState, InfiniteScrollFooter, LoadingState } from '../common';
import { MovieGridItem } from '../movie/MovieGridItem';
import { PosterImage } from '../movie/PosterImage';
import { Button, Screen, Spacer, TextField, Txt } from '../primitives';
import {
  useAddMoviesToCollection,
  useCollectionMovies,
  useRemoveMovieFromCollection,
  useUpdateCollection,
} from '../../hooks/useCollection';
import { useMovieSearch, useMovieSync } from '../../hooks/useMovies';
import { useMyRecords } from '../../hooks/useRecords';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';
import type { CollectionResponse } from '../../types';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;
const GRID_COLUMNS = 3;
const GRID_GAP = 2;

type Tab = 'movies' | 'search' | 'records';
const TAB_LABEL: Record<Tab, string> = { movies: '현재 영화', search: '검색해서 추가', records: '내 기록에서 추가' };

interface CollectionEditModalProps {
  visible: boolean;
  onClose: () => void;
  collectionId: number;
  name: string;
  description?: string | null;
  // 이름/설명 저장 성공 시 호출부가 라우트 파라미터(헤더 제목 등)를 갱신할 수 있게 넘겨준다.
  onInfoSaved?: (result: CollectionResponse) => void;
}

// "컬렉션 수정"을 이름/설명 편집에 그치지 않고 영화 추가·제거까지 한 화면에서 하도록
// 통합한 편집 모달 — 실기기 검증 피드백 반영(2026-09-10, 브라우징 화면의 X 버튼이 UI상
// 안 좋다는 지적 + 검색·내 기록에서 바로 추가하고 싶다는 요청).
export function CollectionEditModal({
  visible,
  onClose,
  collectionId,
  name: initialName,
  description: initialDescription,
  onInfoSaved,
}: CollectionEditModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const userId = useAuthStore((s) => s.user?.id);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('movies');
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [syncingTmdbId, setSyncingTmdbId] = useState<number | null>(null);

  const updateCollection = useUpdateCollection();
  const movies = useCollectionMovies(collectionId);
  const addMovies = useAddMoviesToCollection();
  const removeMovie = useRemoveMovieFromCollection();
  const search = useMovieSearch(submittedQuery);
  const sync = useMovieSync();
  const records = useMyRecords(userId ?? 0);

  const currentItems = movies.data?.pages.flatMap((p) => p.content) ?? [];
  const existingIds = new Set(currentItems.map((m) => m.movieId));
  const cellWidth = (windowWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  function handleSaveInfo() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('컬렉션 이름을 입력해 주세요');
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setNameError(`이름은 ${NAME_MAX}자 이내로 입력해 주세요`);
      return;
    }
    if (description.length > DESCRIPTION_MAX) {
      Alert.alert('설명이 너무 길어요', `설명은 ${DESCRIPTION_MAX}자 이내로 입력해 주세요`);
      return;
    }
    setNameError(undefined);
    updateCollection.mutate(
      { collectionId, body: { name: trimmedName, description: description.trim() || undefined } },
      {
        onSuccess: (data) => onInfoSaved?.(data),
        onError: (error) => Alert.alert('저장 실패', error.message),
      },
    );
  }

  function addMovieId(movieId: number) {
    addMovies.mutate(
      { collectionId, body: { movieIds: [movieId] } },
      { onError: (error) => Alert.alert('실패', error.message) },
    );
  }

  function addFromSearch(item: { kind: 'registered' | 'suggestion'; id: number }) {
    if (item.kind === 'registered') {
      addMovieId(item.id);
      return;
    }
    // suggestion은 아직 우리 DB에 없다 — sync로 등록해 movieId를 받은 뒤에야 담을 수 있다.
    setSyncingTmdbId(item.id);
    sync.mutate(
      { tmdbId: item.id },
      {
        onSuccess: ({ movieId }) => {
          setSyncingTmdbId(null);
          addMovieId(movieId);
        },
        onError: (error) => {
          setSyncingTmdbId(null);
          Alert.alert('실패', error.message);
        },
      },
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen padded={false} edges={['top', 'left', 'right']}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Txt variant="body" color="primary">
              닫기
            </Txt>
          </Pressable>
          <Txt variant="h4">컬렉션 편집</Txt>
          <Pressable onPress={handleSaveInfo} hitSlop={8} disabled={updateCollection.isPending}>
            <Txt variant="body" color="primary">
              저장
            </Txt>
          </Pressable>
        </View>

        <View className="px-4 py-3">
          <TextField
            label="이름"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
            maxLength={NAME_MAX + 1}
          />
          <Spacer size="sm" />
          <TextField
            label="설명"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            maxLength={DESCRIPTION_MAX + 1}
          />
        </View>

        <View className="flex-row border-b border-border">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="flex-1 items-center py-2"
              style={tab === t ? { borderBottomWidth: 2, borderBottomColor: colors.primary } : undefined}
            >
              <Txt variant="caption" color={tab === t ? 'primary' : 'mutedForeground'}>
                {TAB_LABEL[t]}
              </Txt>
            </Pressable>
          ))}
        </View>

        <View className="flex-1">
          {tab === 'movies' &&
            (movies.isLoading ? (
              <LoadingState />
            ) : movies.isError || !movies.data ? (
              <ErrorState message={movies.error?.message} onRetry={() => movies.refetch()} />
            ) : currentItems.length === 0 ? (
              <EmptyState title="담긴 영화가 없어요" description="검색하거나 내 기록에서 추가해보세요" />
            ) : (
              <FlatList
                data={currentItems}
                numColumns={GRID_COLUMNS}
                columnWrapperStyle={{ gap: GRID_GAP }}
                keyExtractor={(item) => String(item.movieId)}
                contentContainerStyle={{ padding: 12, gap: GRID_GAP }}
                renderItem={({ item }) => (
                  <MovieGridItem
                    id={item.movieId!}
                    title={item.title!}
                    posterPath={item.posterPath}
                    width={cellWidth}
                    onPress={() => {}}
                    onRemove={() =>
                      removeMovie.mutate(
                        { collectionId, movieId: item.movieId! },
                        { onError: (error) => Alert.alert('실패', error.message) },
                      )
                    }
                  />
                )}
                onEndReached={() => {
                  if (movies.hasNextPage && !movies.isFetchingNextPage) movies.fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  <InfiniteScrollFooter visible={movies.hasNextPage ?? false} loading={movies.isFetchingNextPage} />
                }
              />
            ))}

          {tab === 'search' && (
            <View className="flex-1">
              <View className="px-4 py-2">
                <TextField
                  placeholder="영화 제목 검색"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={() => setSubmittedQuery(searchInput.trim())}
                  returnKeyType="search"
                />
              </View>
              {submittedQuery.trim().length === 0 ? (
                <EmptyState title="영화를 검색해 보세요" />
              ) : search.isLoading ? (
                <LoadingState />
              ) : search.isError || !search.data ? (
                <ErrorState message={search.error?.message} onRetry={() => search.refetch()} />
              ) : (
                (() => {
                  const pages = search.data.pages;
                  const registered = pages.flatMap((p) => p.registered?.content ?? []);
                  const suggestions = (pages[0]?.suggestions ?? []).slice(0, 8);
                  if (registered.length === 0 && suggestions.length === 0) {
                    return <EmptyState title="검색 결과가 없습니다" />;
                  }
                  return (
                    <FlatList
                      data={[
                        ...registered.map((m) => ({ kind: 'registered' as const, id: m.id!, title: m.title!, posterPath: m.posterPath })),
                        ...suggestions.map((m) => ({ kind: 'suggestion' as const, id: m.tmdbId!, title: m.title!, posterPath: m.posterPath })),
                      ]}
                      keyExtractor={(item) => `${item.kind}-${item.id}`}
                      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                      renderItem={({ item }) => {
                        const already = item.kind === 'registered' && existingIds.has(item.id);
                        const pending = item.kind === 'suggestion' && syncingTmdbId === item.id;
                        return (
                          <PickerRow
                            title={item.title}
                            posterPath={item.posterPath}
                            id={item.id}
                            already={already}
                            pending={pending}
                            onAdd={() => addFromSearch(item)}
                          />
                        );
                      }}
                      onEndReached={() => {
                        if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
                      }}
                      onEndReachedThreshold={0.5}
                      ListFooterComponent={
                        <InfiniteScrollFooter visible={search.hasNextPage ?? false} loading={search.isFetchingNextPage} />
                      }
                    />
                  );
                })()
              )}
            </View>
          )}

          {tab === 'records' &&
            (records.isLoading ? (
              <LoadingState />
            ) : records.isError || !records.data ? (
              <ErrorState message={records.error?.message} onRetry={() => records.refetch()} />
            ) : (
              (() => {
                const items = records.data.pages.flatMap((p) => p.content);
                if (items.length === 0) {
                  return <EmptyState title="아직 시청 기록이 없어요" />;
                }
                return (
                  <FlatList
                    data={items}
                    keyExtractor={(item) => String(item.movieId)}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    renderItem={({ item }) => (
                      <PickerRow
                        title={item.title!}
                        posterPath={item.posterPath}
                        id={item.movieId!}
                        already={existingIds.has(item.movieId)}
                        pending={false}
                        onAdd={() => addMovieId(item.movieId!)}
                      />
                    )}
                    onEndReached={() => {
                      if (records.hasNextPage && !records.isFetchingNextPage) records.fetchNextPage();
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                      <InfiniteScrollFooter visible={records.hasNextPage ?? false} loading={records.isFetchingNextPage} />
                    }
                  />
                );
              })()
            ))}
        </View>
      </Screen>
    </Modal>
  );
}

interface PickerRowProps {
  id: number;
  title: string;
  posterPath?: string | null;
  already: boolean;
  pending: boolean;
  onAdd: () => void;
}

// 검색·내 기록 탭 공용 행 — 담김/추가 상태만 다르다. 탐색용 MovieListItem과 달리
// 탭하면 이동이 아니라 담기가 일어나야 해서 별도로 둔다.
function PickerRow({ id, title, posterPath, already, pending, onAdd }: PickerRowProps) {
  return (
    <View className="flex-row items-center py-2">
      <PosterImage id={id} posterPath={posterPath} width={56} height={80} />
      <Txt variant="body" numberOfLines={2} className="ml-3 flex-1">
        {title}
      </Txt>
      <Button variant="secondary" onPress={onAdd} disabled={already || pending} className="px-3">
        {pending ? '처리 중' : already ? '담김' : '추가'}
      </Button>
    </View>
  );
}
