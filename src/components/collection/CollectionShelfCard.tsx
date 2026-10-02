import { Pressable, useWindowDimensions, View } from 'react-native';
import { Txt } from '../primitives/Txt';
import { shelf } from '../../theme/tokens';
import { SHELF_PADDING_X, ShelfRow } from './ShelfRow';

// 첫 레이아웃 전 추정용 — CollectionListScreen의 contentContainerStyle padding(16)과 같다.
// 추정이 틀려도 ShelfRow의 onLayout이 곧바로 실측값으로 바로잡는다.
const LIST_PADDING_X = 16;

interface CollectionShelfCardProps {
  id: number;
  name: string;
  movieCount: number;
  description?: string;
  // CollectionResponse.previewPosterPaths(백엔드 5-4-A ③, B-6 해소 2026-09-27). posterPath 원형 —
  // URL 조립은 PosterImage가 SHELF(w185)로 한다(2026-09-27 크기 확대로 w92에서 변경).
  posters?: string[];
  onPress: () => void;
}

// 목록 카드 = "선반 위 포스터 진열" 한 줄(ShelfRow) + 이름·편수·설명. 선반 그림은 컬렉션 상세와
// 공유한다(2026-10-02).
export function CollectionShelfCard({ id, name, movieCount, description, posters = [], onPress }: CollectionShelfCardProps) {
  const { width: windowWidth } = useWindowDimensions();

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityLabel={[`${name}, 영화 ${movieCount}편`, description].filter(Boolean).join(', ')}
      // 테두리 — 카드 배경(bg-card)과 화면 배경이 같은 흰색 계열이라 경계가 보이지 않았다(2026-09-27).
      // 색은 선반 토큰(shelf.cardBorder, 브랜드 primary)에서 — 선반 색은 전부 shelf에 모은다.
      // ⚠️ 두께·색을 둘 다 style로 준다 — className `border`와 인라인 borderColor를 섞으면
      // NativeWind가 기본 테두리 색을 함께 넣어 브랜드 색이 덮일 여지가 있다(2026-09-27).
      className="overflow-hidden rounded-lg bg-card"
      style={{ borderWidth: 1, borderColor: shelf.cardBorder }}
    >
      {/* ♿ 선반·포스터는 장식이다 — 카드는 위 accessibilityLabel 하나로만 읽혀야 한다 */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <ShelfRow
          posters={posters.map((posterPath, index) => ({ key: index, id: id * 31 + index, posterPath }))}
          estimatedWidth={windowWidth - LIST_PADDING_X * 2 - SHELF_PADDING_X * 2}
        />
      </View>

      <View className="px-3.5 py-2">
        <View className="flex-row items-center justify-between">
          <Txt variant="body" numberOfLines={1} className="flex-1">
            {name}
          </Txt>
          <Txt variant="caption" color="mutedForeground" className="ml-2">
            영화 {movieCount}편
          </Txt>
        </View>
        {description && (
          <Txt variant="caption" color="mutedForeground" numberOfLines={1} className="mt-0.5">
            {description}
          </Txt>
        )}
      </View>
    </Pressable>
  );
}
