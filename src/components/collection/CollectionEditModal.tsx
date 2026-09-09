import { useEffect, useState } from 'react';
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
const GRID_PADDING = 12;

type Tab = 'movies' | 'search' | 'records';
const TAB_LABEL: Record<Tab, string> = { movies: '현재 영화', search: '검색해서 추가', records: '내 기록에서 추가' };

interface PendingMovie {
  movieId: number;
  title: string;
  posterPath?: string | null;
}

interface CollectionEditModalProps {
  visible: boolean;
  onClose: () => void;
  collectionId: number;
  name: string;
  description?: string | null;
  // 저장 성공 시 호출부가 라우트 파라미터(헤더 제목 등)를 갱신할 수 있게 넘겨준다.
  onInfoSaved?: (result: CollectionResponse) => void;
}

// "컬렉션 수정"을 이름/설명 편집에 그치지 않고 영화 추가·제거까지 한 화면에서 하도록
// 통합한 편집 모달 — 실기기 검증 피드백 반영(2026-09-10). 모든 변경(이름·설명·영화
// 추가/제거)은 화면에는 즉시 반영되어 보이지만, 실제 서버 반영은 **"저장"을 눌러야만**
// 한 번에 일어난다 — "닫기"를 누르면 전부 취소된다(2026-09-10 후속 피드백, 두 번째 라운드).
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
  const [isSaving, setIsSaving] = useState(false);

  // ★ 저장 전까지는 서버를 건드리지 않는다 — 화면에는 즉시 반영해 보여 주고, 실제
  // add/remove 호출은 handleSave 안에서 한 번에 나간다.
  const [pendingAdd, setPendingAdd] = useState<Map<number, PendingMovie>>(new Map());
  const [pendingRemove, setPendingRemove] = useState<Set<number>>(new Set());

  // 열릴 때마다 초기값으로 되돌린다 — 이 모달은 visible로만 토글되고 계속 마운트돼 있어서,
  // 리셋하지 않으면 "닫기"로 취소한 값이 다음에 열 때도 남는다.
  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setDescription(initialDescription ?? '');
    setNameError(undefined);
    setTab('movies');
    setSearchInput('');
    setSubmittedQuery('');
    setPendingAdd(new Map());
    setPendingRemove(new Set());
  }, [visible, initialName, initialDescription]);

  const updateCollection = useUpdateCollection();
  const movies = useCollectionMovies(collectionId);
  const addMovies = useAddMoviesToCollection();
  const removeMovie = useRemoveMovieFromCollection();
  const search = useMovieSearch(submittedQuery);
  const sync = useMovieSync();
  const records = useMyRecords(userId ?? 0);

  const serverItems = movies.data?.pages.flatMap((p) => p.content) ?? [];
  // 서버 목록에서 제거 대기 중인 것을 빼고, 추가 대기 중인 것을 얹은 "지금 화면에 보일 목록".
  const visibleItems: PendingMovie[] = [
    ...serverItems
      .filter((m) => !pendingRemove.has(m.movieId!))
      .map((m) => ({ movieId: m.movieId!, title: m.title!, posterPath: m.posterPath })),
    ...Array.from(pendingAdd.values()),
  ];
  const visibleIds = new Set(visibleItems.map((m) => m.movieId));
  // ⚠️ 그리드에 좌우 padding(GRID_PADDING)이 있다 — 이걸 빼지 않고 windowWidth 기준으로만
  // 셀 폭을 계산하면 한 행의 실제 너비가 컨테이너보다 커져 맨 오른쪽 셀이 잘린다.
  const cellWidth = (windowWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  function stageAdd(movie: PendingMovie) {
    if (pendingRemove.has(movie.movieId)) {
      // 이번 편집 세션에서 뺐다가 다시 담는 경우 — 원래 있던 것이니 제거 대기만 취소한다.
      setPendingRemove((prev) => {
        const next = new Set(prev);
        next.delete(movie.movieId);
        return next;
      });
      return;
    }
    setPendingAdd((prev) => new Map(prev).set(movie.movieId, movie));
  }

  function stageRemove(movieId: number) {
    if (pendingAdd.has(movieId)) {
      // 이번 편집 세션에서 새로 담은 것이면 서버에 존재하지 않으니 추가 대기만 취소한다.
      setPendingAdd((prev) => {
        const next = new Map(prev);
        next.delete(movieId);
        return next;
      });
      return;
    }
    setPendingRemove((prev) => new Set(prev).add(movieId));
  }

  function addFromSearch(item: { kind: 'registered' | 'suggestion'; id: number; title: string; posterPath?: string | null }) {
    if (item.kind === 'registered') {
      stageAdd({ movieId: item.id, title: item.title, posterPath: item.posterPath });
      return;
    }
    // suggestion은 아직 우리 DB에 없다 — sync로 등록해 movieId를 받아야 담을 수 있다.
    // sync 자체는 "이 영화를 카탈로그에 등록"하는 전역 동작이라(검색 화면도 동일하게 즉시
    // 호출한다) 편집 취소와 무관하게 지금 바로 실행한다 — 취소해도 되돌릴 대상이 아니다.
    setSyncingTmdbId(item.id);
    sync.mutate(
      { tmdbId: item.id },
      {
        onSuccess: ({ movieId }) => {
          setSyncingTmdbId(null);
          stageAdd({ movieId, title: item.title, posterPath: item.posterPath });
        },
        onError: (error) => {
          setSyncingTmdbId(null);
          Alert.alert('실패', error.message);
        },
      },
    );
  }

  async function handleSave() {
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
    setIsSaving(true);
    try {
      const updated = await updateCollection.mutateAsync({
        collectionId,
        body: { name: trimmedName, description: description.trim() || undefined },
      });
      if (pendingAdd.size > 0) {
        await addMovies.mutateAsync({ collectionId, body: { movieIds: Array.from(pendingAdd.keys()) } });
      }
      // ⚠️ 제거는 벌크 엔드포인트가 없다 — 한 편씩 호출한다.
      if (pendingRemove.size > 0) {
        await Promise.all(
          Array.from(pendingRemove).map((movieId) => removeMovie.mutateAsync({ collectionId, movieId })),
        );
      }
      onInfoSaved?.(updated);
      onClose();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen padded={false} edges={['top', 'left', 'right']}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8} disabled={isSaving}>
            <Txt variant="body" color="mutedForeground">
              닫기
            </Txt>
          </Pressable>
          <Txt variant="h4">컬렉션 편집</Txt>
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSaving}>
            <Txt variant="body" color="primary">
              {isSaving ? '저장 중…' : '저장'}
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
            ) : visibleItems.length === 0 ? (
              <EmptyState title="담긴 영화가 없어요" description="검색하거나 내 기록에서 추가해보세요" />
            ) : (
              <FlatList
                data={visibleItems}
                numColumns={GRID_COLUMNS}
                columnWrapperStyle={{ gap: GRID_GAP }}
                keyExtractor={(item) => String(item.movieId)}
                contentContainerStyle={{ padding: GRID_PADDING, gap: GRID_GAP }}
                renderItem={({ item }) => (
                  <MovieGridItem
                    id={item.movieId}
                    title={item.title}
                    posterPath={item.posterPath}
                    width={cellWidth}
                    onPress={() => {}}
                    onRemove={() => stageRemove(item.movieId)}
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
                        const already = item.kind === 'registered' && visibleIds.has(item.id);
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
                        already={visibleIds.has(item.movieId!)}
                        pending={false}
                        onAdd={() => stageAdd({ movieId: item.movieId!, title: item.title!, posterPath: item.posterPath })}
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
