import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
  // uri 기준으로 상태를 둔다 — 같은 컴포넌트에 다른 포스터가 들어오면 자동으로 다시 로딩 상태가 된다.
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);

  // 경로가 없거나 로드에 실패하면 결정론적 색 그라디언트 — "포스터 없음"의 표시다.
  // 로딩 중(스피너)과 모양을 다르게 둬 둘을 구분한다(2026-09-27).
  if (!uri || failedUri === uri) {
    // 폴백 색은 결정론적이어야 한다 — Math.random()이면 재렌더마다 깜빡인다 (§4).
    const color = posterFallbackPalette[Math.abs(id) % posterFallbackPalette.length];
    return (
      <LinearGradient colors={[color, colors.muted]} style={{ width, height, borderRadius }} className={className} />
    );
  }

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden' }} className={className}>
      {/* 로딩 중 스피너 — 이미지 아래에 깔려 있다가 도착한 포스터가 transition으로 덮는다.
          ⚠️ reanimated opacity 반짝임(스켈레톤)은 빠른 스크롤에서 로딩 중인 칸 수만큼 애니메이션이
          동시에 돌아 프레임 드랍이 심했다(2026-09-27 실기기). ActivityIndicator는 Android 네이티브
          ProgressBar라 그리기가 JS/reanimated를 거치지 않는다. */}
      {loadedUri !== uri && (
        <View style={StyleSheet.absoluteFill} className="items-center justify-center">
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      )}
      <Image
        source={uri}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        recyclingKey={String(id)}
        onLoad={() => setLoadedUri(uri)}
        onError={() => setFailedUri(uri)}
      />
    </View>
  );
}
