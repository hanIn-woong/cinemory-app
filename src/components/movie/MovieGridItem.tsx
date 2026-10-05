import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { PosterImage } from './PosterImage';
import { PosterSize } from '../../constants/tmdb';
import { Txt } from '../primitives/Txt';
import { colors } from '../../theme/tokens';

interface MovieGridItemProps {
  id: number;
  title: string;
  posterPath?: string | null;
  width: number;
  onPress: () => void;
  // 있으면 우상단에 제거 버튼을 띄운다(컬렉션 편집 화면 전용 — docs/M2C-screens-spec.md §5.3).
  onRemove?: () => void;
  // 포스터 아래에 제목을 2줄까지 그린다(리포트 5점작 그리드 — docs/M2C2-report-spec.md §9.5).
  // ⚠️ 기본 false — 서재 그리드(RecordsTab·WishesTab)는 포스터만 보인다.
  showTitle?: boolean;
  // 작은 셀(4열 등)에서는 SHELF(w185)로 낮춘다. 기본은 PosterImage 기본값(LIST).
  posterSize?: keyof typeof PosterSize;
}

// 3열 그리드 셀 — 포스터만 보인다(제목 없음, 사용자 요청). 열 폭은 화면 크기에 따라
// 호출부(MyRecords 등)가 계산해 넘긴다. title은 showTitle일 때만 화면에 그리고, 그 외에는 접근성 라벨용이다.
export function MovieGridItem({
  id,
  title,
  posterPath,
  width,
  onPress,
  onRemove,
  showTitle = false,
  posterSize,
}: MovieGridItemProps) {
  const height = width * 1.5; // posterAspectRatio 2/3 → height = width / (2/3)

  return (
    <View style={{ width }}>
      <Pressable onPress={onPress} accessibilityLabel={title}>
        <PosterImage id={id} posterPath={posterPath} width={width} height={height} size={posterSize} />
        {showTitle && (
          <Txt variant="caption" numberOfLines={2} className="mt-1">
            {title}
          </Txt>
        )}
      </Pressable>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityLabel={`${title} 제거`}
          className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
        >
          <X size={14} color={colors.primaryForeground} />
        </Pressable>
      )}
    </View>
  );
}
