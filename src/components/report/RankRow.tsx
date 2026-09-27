import { Pressable, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { PosterImage } from '../movie/PosterImage';
import { Txt } from '../primitives/Txt';

interface RankRowProps {
  rank: number;
  label: string;
  // 부가정보 — 재관람 횟수·OTT 회수·선호 TOP 편수 등. 선호 TOP은 score 정렬이라 편수가 순서와
  // 어긋날 수 있어 섹션에 정렬 기준을 함께 적는다(docs/M2C2-report-spec.md §5.1 3번, 2026-09-28).
  meta?: string;
  posterPath?: string | null;
  movieId?: number;
  onPress?: () => void;
}

// 순위 뱃지 + 이름 + 부가정보 — 선호 TOP·재관람 공용(docs/M2C2-report-spec.md §4.2).
export function RankRow({ rank, label, meta, posterPath, movieId, onPress }: RankRowProps) {
  const content = (
    <View className="flex-row items-center py-2">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-muted">
        <Txt variant="caption" className="font-semibold">
          {rank}
        </Txt>
      </View>
      {movieId != null && (
        <View className="ml-2">
          <PosterImage id={movieId} posterPath={posterPath} width={32} height={45} />
        </View>
      )}
      <Txt variant="body" className="ml-3 flex-1" numberOfLines={1}>
        {label}
      </Txt>
      {meta && (
        <Txt variant="caption" color="mutedForeground">
          {meta}
        </Txt>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: colors.muted }}>
      {content}
    </Pressable>
  );
}
