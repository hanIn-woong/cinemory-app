const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// BACKDROP_TILE(w92) — 홈 배경 그리드 전용. 작은 원본을 큰 셀에 넣어 업스케일로
// 뭉개지게 하는 것 자체가 blur 대체 수단이다(docs/M2-frontend-spec.md §9.1,
// expo-blur는 Android 성능 이슈로 마지막 수단). LIST/DETAIL과 섞어 쓰지 않는다.
// LIST는 원래 w185였는데, 3열 그리드 셀(보통 120~140dp)이 2~3배 밀도 기기에서
// 240~420 물리 픽셀을 요구해 w185(185px) 소스가 업스케일되어 흐려 보였다 — w342로 올려
// 3배 밀도까지 커버한다(2026-09-10, 실기기 화질 확인 후 조정).
// HERO — MovieDetail 상단의 화면 폭 대형 포스터 전용(2026-09-10, 히어로 배경 이미지를
// 대형 포스터로 교체하며 신설). backdropPath가 없어 posterPath를 그대로 키운다.
export const PosterSize = { LIST: 'w342', DETAIL: 'w500', BACKDROP_TILE: 'w92', HERO: 'w780' } as const;
export const ProfileSize = { LIST: 'w185' } as const;

export function tmdbImageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
