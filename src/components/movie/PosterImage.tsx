import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PosterSize, tmdbImageUrl } from '../../constants/tmdb';
import { colors, posterFallbackPalette, radius } from '../../theme/tokens';

interface PosterImageProps {
  posterPath?: string | null;
  // 폴백 색 결정에 쓴다 — movieId 또는(미등록이면) tmdbId.
  id: number;
  width: number;
  height: number;
  size?: keyof typeof PosterSize;
  // 기본은 radius.sm(6) — 선반 카드처럼 더 작은 모서리가 필요하면 지정한다.
  radius?: number;
  className?: string;
}

export function PosterImage({ posterPath, id, width, height, size = 'LIST', radius: cornerRadius, className }: PosterImageProps) {
  const uri = tmdbImageUrl(posterPath, PosterSize[size]);
  const borderRadius = cornerRadius ?? radius.sm;

  if (!uri) {
    // 폴백 색은 결정론적이어야 한다 — Math.random()이면 재렌더마다 깜빡인다 (§4).
    const color = posterFallbackPalette[Math.abs(id) % posterFallbackPalette.length];
    return (
      <LinearGradient colors={[color, colors.muted]} style={{ width, height, borderRadius }} className={className} />
    );
  }

  return <Image source={{ uri }} style={{ width, height, borderRadius }} className={className} />;
}