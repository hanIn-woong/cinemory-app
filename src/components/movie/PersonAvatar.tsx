import { User as UserIcon } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { ProfileSize, tmdbImageUrl } from '../../constants/tmdb';
import { colors } from '../../theme/tokens';

interface PersonAvatarProps {
  profilePath?: string | null;
  // 상세 출연진 64 · 리포트 56/40/32/28 (docs/M2C2-report-spec.md §10.2)
  size?: number;
}

// 인물 원형 사진 — 영화 상세 출연진과 리포트 인물 TOP 공용. 최대 표시가 64dp라 ProfileSize.LIST(w185) 하나로 충분하다.
export function PersonAvatar({ profilePath, size = 64 }: PersonAvatarProps) {
  const uri = tmdbImageUrl(profilePath, ProfileSize.LIST);
  if (!uri) {
    return (
      <View
        className="items-center justify-center bg-muted"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        {/* 0.375 — 64에서 24(추출 전 상세 화면 값)가 정확히 나온다. 스펙의 0.4는 25.6이 돼 상세가 달라진다 */}
        <UserIcon size={Math.round(size * 0.375)} color={colors.mutedForeground} />
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}
