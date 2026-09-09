import { Pressable } from 'react-native';
import { PosterImage } from './PosterImage';

interface MovieGridItemProps {
  id: number;
  title: string;
  posterPath?: string | null;
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
}

// 3열 그리드 셀 — 포스터만 보인다(제목 없음, 사용자 요청). 열 폭은 화면 크기에 따라
// 호출부(MyRecords 등)가 계산해 넘긴다. title은 접근성 라벨용으로만 쓴다.
export function MovieGridItem({ id, title, posterPath, width, onPress, onLongPress }: MovieGridItemProps) {
  const height = width * 1.5; // posterAspectRatio 2/3 → height = width / (2/3)

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityLabel={title} style={{ width }}>
      <PosterImage id={id} posterPath={posterPath} width={width} height={height} />
    </Pressable>
  );
}
