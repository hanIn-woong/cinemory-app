const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// BACKDROP_TILE(w92) — 홈 배경 그리드 전용. 작은 원본을 큰 셀에 넣어 업스케일로
// 뭉개지게 하는 것 자체가 blur 대체 수단이다(docs/M2-frontend-spec.md §9.1,
// expo-blur는 Android 성능 이슈로 마지막 수단). LIST/DETAIL과 섞어 쓰지 않는다.
export const PosterSize = { LIST: 'w185', DETAIL: 'w500', BACKDROP_TILE: 'w92' } as const;
export const ProfileSize = { LIST: 'w185' } as const;
export const BackdropSize = { DETAIL: 'w780' } as const;

export function tmdbImageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
