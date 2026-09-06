// 첫 요소는 도메인, 둘째는 동작, 셋째부터 식별자 — invalidateQueries(['movies'])
// 같은 광역 무효화가 가능해야 한다 (docs/M2A-foundation-spec.md §7).
export const queryKeys = {
  movies: {
    search: (query: string, year?: number) => ['movies', 'search', { query, year }] as const,
    detail: (movieId: number) => ['movies', 'detail', movieId] as const,
    cast: (movieId: number) => ['movies', 'cast', movieId] as const,
    random: (size: number) => ['movies', 'random', size] as const,
  },
  records: {
    ofUser: (userId: number) => ['records', 'ofUser', userId] as const,
    ofUserMovie: (userId: number, movieId: number) => ['records', 'ofUserMovie', userId, movieId] as const,
    // "N편 관람" 표시용 — size=1 조회. ofUser(무한스크롤)와 캐시 모양이 달라 키를 분리한다.
    count: (userId: number) => ['records', 'count', userId] as const,
    // 홈 배경용 — size가 화면 격자 크기에 따라 달라져 ofUser(무한스크롤)와 캐시 모양이 다르다.
    homeBackground: (userId: number, size: number) => ['records', 'homeBackground', userId, size] as const,
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
