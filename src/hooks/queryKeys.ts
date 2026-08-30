// 첫 요소는 도메인, 둘째는 동작, 셋째부터 식별자 — invalidateQueries(['movies'])
// 같은 광역 무효화가 가능해야 한다 (docs/M2A-foundation-spec.md §7).
export const queryKeys = {
  movies: {
    search: (query: string, year?: number) => ['movies', 'search', { query, year }] as const,
    detail: (movieId: number) => ['movies', 'detail', movieId] as const,
    cast: (movieId: number) => ['movies', 'cast', movieId] as const,
  },
  records: {
    ofUser: (userId: number) => ['records', 'ofUser', userId] as const,
    ofUserMovie: (userId: number, movieId: number) => ['records', 'ofUserMovie', userId, movieId] as const,
  },
  reviews: {
    me: (movieId: number) => ['reviews', 'me', movieId] as const,
  },
  wishes: {
    me: (movieId: number) => ['wishes', 'me', movieId] as const,
    ofUser: (userId: number) => ['wishes', 'ofUser', userId] as const,
  },
  collections: {
    ofUser: (userId: number) => ['collections', 'ofUser', userId] as const,
    movies: (collectionId: number) => ['collections', 'movies', collectionId] as const,
  },
  users: {
    me: () => ['users', 'me'] as const,
  },
} as const;
