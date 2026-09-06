import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, SectionList, View } from 'react-native';
import type { ApiError } from '../../api/client';
import { EmptyState, ErrorState, InfiniteScrollFooter, LoadingState } from '../../components/common';
import { MovieListItem } from '../../components/movie/MovieListItem';
import { Screen, Txt } from '../../components/primitives';
import { useMovieSearch, useMovieSync } from '../../hooks/useMovies';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { HomeStackParamList } from '../../navigation/types';

// 소스에 개수 제한이 없어 최대 20건이 그대로 온다 — 화면에서 5~10건으로 자른다 (§5.3).
const SUGGESTIONS_LIMIT = 8;

type Nav = NativeStackNavigationProp<HomeStackParamList, 'SearchResult'>;
type Rt = RouteProp<HomeStackParamList, 'SearchResult'>;

// registered(MovieSummary)와 suggestions(MovieSuggestion)는 필드 구성이 다르다
// (suggestions엔 movieId가 없다 — 미등록의 신호). SectionList는 섹션 간 아이템 타입이
// 같아야 하므로 렌더 전에 공통 모양으로 정규화한다. id는 registered면 movieId,
// suggestion이면 tmdbId — 포스터 폴백 색 결정과 탭 동작 분기에 같이 쓴다.
interface SearchListItem {
  kind: 'registered' | 'suggestion';
  id: number;
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
}

export function SearchResultScreen() {
  const navigation = useNavigation<Nav>();
  const { query } = useRoute<Rt>().params;
  const requireAuth = useRequireAuth();
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const search = useMovieSearch(query);
  const sync = useMovieSync();

  if (search.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (search.isError || !search.data) {
    return (
      <Screen>
        <ErrorState message={search.error?.message} onRetry={() => search.refetch()} />
      </Screen>
    );
  }

  const pages = search.data.pages;
  const registered: SearchListItem[] = pages
    .flatMap((p) => p.registered?.content ?? [])
    .map((m) => ({ kind: 'registered', id: m.id!, title: m.title!, posterPath: m.posterPath, releaseDate: m.releaseDate }));
  // suggestions는 page 1에서만 채워진다(§3.3) — 첫 페이지만 본다.
  const suggestions: SearchListItem[] = (pages[0]?.suggestions ?? [])
    .slice(0, SUGGESTIONS_LIMIT)
    .map((m) => ({ kind: 'suggestion', id: m.tmdbId!, title: m.title!, posterPath: m.posterPath, releaseDate: m.releaseDate }));

  if (registered.length === 0 && suggestions.length === 0) {
    return (
      <Screen>
        <EmptyState title="검색 결과가 없습니다" description={`'${query}'에 대한 결과를 찾지 못했어요`} />
      </Screen>
    );
  }

  function handleSuggestionPress(item: SearchListItem) {
    // sync는 인증 필수(§6.7 표) — 게스트면 액션 게이트가 AuthModal을 띄운다.
    requireAuth(() => {
      setSyncingId(item.id);
      sync.mutate(
        { tmdbId: item.id },
        {
          onSuccess: ({ movieId }) => {
            setSyncingId(null);
            navigation.navigate('MovieDetail', { movieId });
          },
          onError: (error: ApiError) => {
            setSyncingId(null);
            const message =
              error.code === 'TMDB_MOVIE_NOT_FOUND'
                ? '영화 정보를 찾을 수 없습니다'
                : error.code === 'ADULT_CONTENT_NOT_ALLOWED'
                  ? '지원하지 않는 콘텐츠입니다'
                  : error.message;
            Alert.alert('오류', message);
          },
        },
      );
    });
  }

  const sections = [
    { title: '내 서재에 있는 작품', data: registered },
    { title: '더 찾아보기', data: suggestions },
  ].filter((s) => s.data.length > 0);

  return (
    <Screen padded={false}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderSectionHeader={({ section }) => (
          <View className="bg-background py-2">
            <Txt variant="h4">{section.title}</Txt>
          </View>
        )}
        renderItem={({ item }) => (
          <MovieListItem
            id={item.id}
            title={item.title}
            posterPath={item.posterPath}
            releaseDate={item.releaseDate}
            subtitle={syncingId === item.id ? '작품 정보를 가져오는 중…' : undefined}
            onPress={() =>
              item.kind === 'registered'
                ? navigation.navigate('MovieDetail', { movieId: item.id })
                : handleSuggestionPress(item)
            }
          />
        )}
        onEndReached={() => {
          if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <InfiniteScrollFooter visible={search.hasNextPage ?? false} loading={search.isFetchingNextPage} />
        }
        stickySectionHeadersEnabled={false}
      />
    </Screen>
  );
}
