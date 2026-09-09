import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { PosterImage } from './PosterImage';
import { colors } from '../../theme/tokens';

interface MovieGridItemProps {
  id: number;
  title: string;
  posterPath?: string | null;
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
  // 있으면 우상단에 항상 보이는 제거 버튼을 띄운다 — 길게 누르기는 발견성이 낮다
  // (컬렉션 상세 실기기 검증에서 확인, docs/M2C-screens-spec.md §5.3).
  onRemove?: () => void;
}

// 3열 그리드 셀 — 포스터만 보인다(제목 없음, 사용자 요청). 열 폭은 화면 크기에 따라
// 호출부(MyRecords 등)가 계산해 넘긴다. title은 접근성 라벨용으로만 쓴다.
export function MovieGridItem({ id, title, posterPath, width, onPress, onLongPress, onRemove }: MovieGridItemProps) {
  const height = width * 1.5; // posterAspectRatio 2/3 → height = width / (2/3)

  return (
    <View style={{ width }}>
      <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityLabel={title}>
        <PosterImage id={id} posterPath={posterPath} width={width} height={height} />
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
