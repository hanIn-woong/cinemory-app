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
  className?: string;
}

export function PosterImage({ posterPath, id, width, height, size = 'LIST', className }: PosterImageProps) {
  const uri = tmdbImageUrl(posterPath, PosterSize[size]);

  if (!uri) {
    // 폴백 색은 결정론적이어야 한다 — Math.random()이면 재렌더마다 깜빡인다 (§4).
    const color = posterFallbackPalette[Math.abs(id) % posterFallbackPalette.length];
    return (
      <LinearGradient
        colors={[color, colors.muted]}
        style={{ width, height, borderRadius: radius.md }}
        className={className}
      />
    );
  }

  return <Image source={{ uri }} style={{ width, height, borderRadius: radius.md }} className={className} />;
}