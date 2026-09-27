import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { PosterImage } from '../movie/PosterImage';
import { Txt } from '../primitives/Txt';
import { shelf } from '../../theme/tokens';

// 포스터 5장이 선반 폭을 좌우 끝까지 채운다(2026-09-27 — 고정 46×69는 카드 오른쪽이 비었다).
// 폭은 선반 안쪽 폭에서 간격을 뺀 5등분, 높이는 2:3.
const SLOTS = 5;
const POSTER_GAP = 7;
const SHELF_PADDING_X = 14;
const POSTER_RADIUS = 3;
// 첫 레이아웃 전 추정용 — CollectionListScreen의 contentContainerStyle padding(16)과 같다.
// 추정이 틀려도 onLayout이 곧바로 실측값으로 바로잡는다(첫 프레임 크기 튐 방지용일 뿐).
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

// 목록 카드 = "선반 위 포스터 진열"(뉴트럴 렛지, 2026-09-09 확정). 새 라이브러리 없이
// 전부 expo-linear-gradient로 만든다(홈 배경에서 이미 사용 중). shadowColor/elevation은
// 플랫폼별 결과가 달라 쓰지 않고, 접지 그림자는 LinearGradient 한 겹으로 대신한다.
export function CollectionShelfCard({ id, name, movieCount, description, posters = [], onPress }: CollectionShelfCardProps) {
  // ⚠️ 부족분을 빈 회색 슬롯으로 채우지 않는다 — 선반 위에서는 로딩 실패처럼 보인다.
  const visiblePosters = posters.slice(0, SLOTS);
  const { width: windowWidth } = useWindowDimensions();
  const [shelfWidth, setShelfWidth] = useState(windowWidth - LIST_PADDING_X * 2 - SHELF_PADDING_X * 2);
  const posterWidth = (shelfWidth - POSTER_GAP * (SLOTS - 1)) / SLOTS;
  const posterHeight = posterWidth * 1.5;

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
        {/* 벽 — 포스터 뒤만 채도 낮춘 브랜드 컬러로 칠한다. 선반 판(아래 그라디언트)에서 끝나고 그 아래
            제목 영역은 카드 흰 바탕이라, 벽 → 선반 → 바닥의 층이 읽힌다 */}
        <View style={{ paddingHorizontal: SHELF_PADDING_X, paddingTop: 12, backgroundColor: shelf.wall }}>
          <View
            onLayout={(e) => setShelfWidth(e.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', alignItems: 'flex-end', gap: POSTER_GAP, height: posterHeight }}
          >
            {visiblePosters.map((posterPath, index) => (
              <View key={index} style={{ width: posterWidth, height: posterHeight }}>
                {/* 접지 그림자 — 포스터 뒤에 깐 그라디언트 한 겹 */}
                <LinearGradient
                  colors={[shelf.groundShadow, 'transparent']}
                  style={{ position: 'absolute', left: -2, right: -2, bottom: -6, height: 12, zIndex: -1 }}
                />
                <PosterImage
                  id={id * 31 + index}
                  posterPath={posterPath}
                  width={posterWidth}
                  height={posterHeight}
                  size="SHELF"
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
