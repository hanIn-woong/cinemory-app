import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { PosterSize } from '../../constants/tmdb';
import { PosterImage } from '../movie/PosterImage';
import { shelf } from '../../theme/tokens';

// 포스터 N장이 선반 폭을 좌우 끝까지 채운다(2026-09-27 — 고정 46×69는 카드 오른쪽이 비었다).
// 폭은 선반 안쪽 폭에서 간격을 뺀 N등분, 높이는 2:3. 칸이 덜 차도 폭은 N등분 그대로라
// 컬렉션 상세에서 줄마다 높이가 같다. 목록 카드는 5칸, 상세는 4칸(2026-10-02).
export const SHELF_SLOTS = 5;
export const SHELF_PADDING_X = 14;
const POSTER_GAP = 7;
const POSTER_RADIUS = 3;

export interface ShelfPoster {
  key: string | number;
  // 폴백 색 결정용 — PosterImage의 id
  id: number;
  posterPath?: string | null;
  // 있으면 포스터가 탭 가능한 버튼이 된다(컬렉션 상세). 없으면 장식(목록 카드).
  onPress?: () => void;
  accessibilityLabel?: string;
}

interface ShelfRowProps {
  posters: ShelfPoster[];
  // 첫 레이아웃 전 추정용 선반 안쪽 폭 — 틀려도 onLayout이 곧바로 실측값으로 바로잡는다
  // (첫 프레임 크기 튐 방지용일 뿐).
  estimatedWidth: number;
  // 한 줄 칸 수 — 기본 5(목록 카드)
  slots?: number;
  // 칸이 커지면 원본도 키운다 — 5칸(~62dp)은 SHELF(w185), 4칸(~85dp)은 3배 밀도에서 ~255px라 LIST(w342).
  posterSize?: keyof typeof PosterSize;
}

// "선반 위 포스터 진열" 한 줄 — 벽 → 포스터 → 선반 판 → 접지 그림자(뉴트럴 렛지, 2026-09-09 확정).
// CollectionShelfCard(목록 카드)와 CollectionDetailScreen(상세)이 같이 쓴다 — 둘의 모양이 따로
// 어긋나지 않게 한 곳에 둔다. 새 라이브러리 없이 전부 expo-linear-gradient로 만든다(홈 배경에서
// 이미 사용 중). shadowColor/elevation은 플랫폼별 결과가 달라 쓰지 않고, 접지 그림자는
// LinearGradient 한 겹으로 대신한다.
// ⚠️ 부족분을 빈 회색 슬롯으로 채우지 않는다 — 선반 위에서는 로딩 실패처럼 보인다.
export function ShelfRow({ posters, estimatedWidth, slots = SHELF_SLOTS, posterSize = 'SHELF' }: ShelfRowProps) {
  const [shelfWidth, setShelfWidth] = useState(estimatedWidth);
  const posterWidth = (shelfWidth - POSTER_GAP * (slots - 1)) / slots;
  const posterHeight = posterWidth * 1.5;

  return (
    <View>
      {/* 벽 — 포스터 뒤만 채도 낮춘 브랜드 컬러로 칠한다. 선반 판(아래 그라디언트)에서 끝나고 그 아래는
          바탕이라, 벽 → 선반 → 바닥의 층이 읽힌다 */}
      <View style={{ paddingHorizontal: SHELF_PADDING_X, paddingTop: 12, backgroundColor: shelf.wall }}>
        <View
          onLayout={(e) => setShelfWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: POSTER_GAP, height: posterHeight }}
        >
          {posters.slice(0, slots).map((p) => {
            const content = (
              <>
              {/* 접지 그림자 — 포스터 뒤에 깐 그라디언트 한 겹 */}
              <LinearGradient
                colors={[shelf.groundShadow, 'transparent']}
                style={{ position: 'absolute', left: -2, right: -2, bottom: -6, height: 12, zIndex: -1 }}
              />
              <PosterImage
                id={p.id}
                posterPath={p.posterPath}
                width={posterWidth}
                height={posterHeight}
                size={posterSize}
                radius={POSTER_RADIUS}
              />
              {/* 광택 — 대각선, 값싼 장식이라 성능 이슈 시 가장 먼저 뺀다 */}
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: POSTER_RADIUS }}
              />
              </>
            );
            // 장식이면 Pressable을 쓰지 않는다 — 목록 카드 자체가 Pressable이라 안쪽에서 터치를 가로채면 안 된다.
            return p.onPress ? (
              <Pressable
                key={p.key}
                onPress={p.onPress}
                accessibilityRole="button"
                accessibilityLabel={p.accessibilityLabel}
                style={({ pressed }) => ({ width: posterWidth, height: posterHeight, opacity: pressed ? 0.7 : 1 })}
              >
                {content}
              </Pressable>
            ) : (
              <View key={p.key} style={{ width: posterWidth, height: posterHeight }}>
                {content}
              </View>
            );
          })}
        </View>
      </View>

      {/* 선반 — 위 밝고 아래 어둡게(두께로 읽힌다) */}
      <LinearGradient colors={[shelf.boardTop, shelf.boardMid, shelf.boardBottom]} style={{ height: 6 }} />
      <View style={{ height: 3, backgroundColor: shelf.edgeBottom }} />
      <LinearGradient colors={[shelf.groundShadow, 'transparent']} style={{ height: 10, opacity: 0.2 }} />
    </View>
  );
}
