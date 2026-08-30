const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const PosterSize = { LIST: 'w185', DETAIL: 'w500' } as const;
export const ProfileSize = { LIST: 'w185' } as const;
export const BackdropSize = { DETAIL: 'w780' } as const;

export function tmdbImageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
