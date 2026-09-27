import { GripVertical } from 'lucide-react-native';
import { View } from 'react-native';
import { Txt } from '../primitives/Txt';
import { colors, shelf } from '../../theme/tokens';

interface CollectionReorderRowProps {
  name: string;
  movieCount: number;
}

// 순서 편집 모드의 컬렉션 카드 — 선반 카드를 간소화한 것(docs/collection-order-spec.md §3.3).
// 드래그 중 포스터 5장 × N개가 함께 움직이면 무거워지므로 포스터를 끄고 이름만 둔다.
// 테두리는 선반 카드와 같은 토큰이라 "같은 카드를 옮기는 중"으로 읽힌다.
export function CollectionReorderRow({ name, movieCount }: CollectionReorderRowProps) {
  return (
    <View
      className="flex-row items-center rounded-lg bg-card px-3.5 py-3"
      style={{ borderWidth: 1, borderColor: shelf.cardBorder }}
    >
      <GripVertical size={18} color={colors.mutedForeground} />
      <Txt variant="body" numberOfLines={1} className="ml-2 flex-1">
        {name}
      </Txt>
      <Txt variant="caption" color="mutedForeground" className="ml-2">
        영화 {movieCount}편
      </Txt>
    </View>
  );
}
