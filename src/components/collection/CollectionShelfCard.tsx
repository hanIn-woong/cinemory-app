import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import { PosterImage } from '../movie/PosterImage';
import { Txt } from '../primitives/Txt';
import { shelf } from '../../theme/tokens';

const POSTER_WIDTH = 46;
const POSTER_HEIGHT = 69;
const POSTER_RADIUS = 3;

interface CollectionShelfCardProps {
  id: number;
  name: string;
  movieCount: number;
  description?: string;
  // B-6 대기 중 — CollectionResponse에 아직 필드가 없다. 오면 그대로 채운다(docs/M2C-screens-spec.md §5.2).
  posters?: string[];
  onPress: () => void;
}

// 목록 카드 = "선반 위 포스터 진열"(뉴트럴 렛지, 2026-09-09 확정). 새 라이브러리 없이
// 전부 expo-linear-gradient로 만든다(홈 배경에서 이미 사용 중). shadowColor/elevation은
// 플랫폼별 결과가 달라 쓰지 않고, 접지 그림자는 LinearGradient 한 겹으로 대신한다.
export function CollectionShelfCard({ id, name, movieCount, description, posters = [], onPress }: CollectionShelfCardProps) {
  // ⚠️ 부족분을 빈 회색 슬롯으로 채우지 않는다 — 선반 위에서는 로딩 실패처럼 보인다.
  const visiblePosters = posters.slice(0, 5);

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityLabel={[`${name}, 영화 ${movieCount}편`, description].filter(Boolean).join(', ')}
      className="overflow-hidden rounded-lg bg-card"
    >
      {/* ♿ 선반·포스터는 장식이다 — 카드는 위 accessibilityLabel 하나로만 읽혀야 한다 */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: POSTER_HEIGHT }}>
            {visiblePosters.map((posterPath, index) => (
              <View key={index} style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}>
                {/* 접지 그림자 — 포스터 뒤에 깐 그라디언트 한 겹 */}
                <LinearGradient
                  colors={[shelf.groundShadow, 'transparent']}
                  style={{ position: 'absolute', left: -2, right: -2, bottom: -6, height: 12, zIndex: -1 }}
                />
                <PosterImage
                  id={id * 31 + index}
                  posterPath={posterPath}
                  width={POSTER_WIDTH}
                  height={POSTER_HEIGHT}
                  size="BACKDROP_TILE"
                  radius={POSTER_RADIUS}
                />
                {/* 광택 — 대각선, 값싼 장식이라 성능 이슈 시 가장 먼저 뺀다 */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: POSTER_RADIUS,
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* 선반 — 위 밝고 아래 어둡게(두께로 읽힌다) */}
        <LinearGradient colors={[shelf.boardTop, shelf.boardMid, shelf.boardBottom]} style={{ height: 6 }} />
        <View style={{ height: 3, backgroundColor: shelf.edgeBottom }} />
        <LinearGradient colors={[shelf.groundShadow, 'transparent']} style={{ height: 10, opacity: 0.2 }} />
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
