import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, View } from 'react-native';
import { EmptyState, ErrorState, InfiniteScrollFooter, LoadingState } from '../common';
import { PosterImage } from '../movie/PosterImage';
import { Button, Screen, TextField, Txt } from '../primitives';
import { useMovieSearch, useMovieSync } from '../../hooks/useMovies';
import { useMyRecords } from '../../hooks/useRecords';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

type Tab = 'search' | 'records';

// 편집 행 둘째 줄용 — 고르기 응답(검색·내 기록)에는 개봉일만 있고 감독이 없어 연도만 채운다. 저장 후 다시 받으면
// 서버 목록 응답(releaseYear · directorNames)으로 바뀐다(docs/M2C-screens-spec.md 2026-10-03 (이어서 3)).
function releaseYear(releaseDate?: string): string | undefined {
  return releaseDate?.slice(0, 4) || undefined;
}
const TAB_LABEL: Record<Tab, string> = { search: '검색해서 추가', records: '내 기록에서 추가' };

export interface PickedMovie {
  movieId: number;
  title: string;
  posterPath?: string | null;
  // 편집 리스트의 둘째 줄(개봉연도 · 감독). 검색·내 기록에서 고른 것은 연도만 있다(감독은 응답에 없음).
  subtitle?: string;
}

interface CollectionAddMoviesModalProps {
  visible: boolean;
  onClose: () => void;
  // 편집 화면에 지금 보이는 영화(담기 대기 포함) — "담김" 표시용
  existingIds: Set<number>;
  // 서버로 보내지 않는다 — 편집 화면이 담기 대기에 올리고 "저장" 때 한 번에 보낸다.
  onPick: (movie: PickedMovie) => void;
}

// 컬렉션 편집 화면의 우측 상단 [+]로 여는 "영화 고르기" 모달(2026-10-02 — 9/10의 통합 편집 모달에서
// 이름·설명 입력과 "현재 영화" 탭을 떼어 내고 고르기만 남겼다, docs/M2C-screens-spec.md §5.3-A).
// 고른 영화는 모달을 닫지 않고 계속 고를 수 있게 그 자리에서 "담김"으로 바뀐다.
export function CollectionAddMoviesModal({ visible, onClose, existingIds, onPick }: CollectionAddMoviesModalProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>('search');
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [syncingTmdbId, setSyncingTmdbId] = useState<number | null>(null);

  const search = useMovieSearch(submittedQuery);
  const sync = useMovieSync();
  const records = useMyRecords(userId ?? 0);

  // 열릴 때마다 검색을 비운다 — visible로만 토글되고 계속 마운트돼 있다.
  useEffect(() => {
    if (!visible) return;
    setTab('search');
    setSearchInput('');
    setSubmittedQuery('');
  }, [visible]);

  function pickFromSearch(item: {
    kind: 'registered' | 'suggestion';
    id: number;
    title: string;
    posterPath?: string | null;
    releaseDate?: string;
  }) {
    if (item.kind === 'registered') {
      onPick({ movieId: item.id, title: item.title, posterPath: item.posterPath, subtitle: releaseYear(item.releaseDate) });
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
          onPick({ movieId, title: item.title, posterPath: item.posterPath, subtitle: releaseYear(item.releaseDate) });
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
          <View style={{ width: 40 }} />
          <Txt variant="h4">영화 추가</Txt>
          <Pressable onPress={onClose} hitSlop={8}>
            <Txt variant="body" color="primary">
              완료
            </Txt>
          </Pressable>
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
                        ...registered.map((m) => ({ kind: 'registered' as const, id: m.id!, title: m.title!, posterPath: m.posterPath, releaseDate: m.releaseDate })),
                        ...suggestions.map((m) => ({ kind: 'suggestion' as const, id: m.tmdbId!, title: m.title!, posterPath: m.posterPath, releaseDate: m.releaseDate })),
                      ]}
                      keyExtractor={(item) => `${item.kind}-${item.id}`}
                      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <PickerRow
                          title={item.title}
                          posterPath={item.posterPath}
                          id={item.id}
                          already={item.kind === 'registered' && existingIds.has(item.id)}
                          pending={item.kind === 'suggestion' && syncingTmdbId === item.id}
                          onAdd={() => pickFromSearch(item)}
                        />
                      )}
                      onEndReached={() => {
                        if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage({ cancelRefetch: false });
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
                        already={existingIds.has(item.movieId!)}
                        pending={false}
                        onAdd={() =>
                          onPick({
                            movieId: item.movieId!,
                            title: item.title!,
                            posterPath: item.posterPath,
                            subtitle: releaseYear(item.releaseDate),
                          })
                        }
                      />
                    )}
                    onEndReached={() => {
                      if (records.hasNextPage && !records.isFetchingNextPage) records.fetchNextPage({ cancelRefetch: false });
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
