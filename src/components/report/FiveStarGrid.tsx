import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MovieGridItem } from '../movie/MovieGridItem';
import { Txt } from '../primitives/Txt';
import { colors } from '../../theme/tokens';

// FiveStarMovieResponse 중 그리드가 쓰는 필드만 — 생성 타입을 그대로 받을 수 있게 구조적으로 둔다.
export interface FiveStarGridItem {
  movieId?: number;
  title?: string;
  posterPath?: string | null;
}

interface FiveStarGridProps {
  movies: FiveStarGridItem[];
  onPressMovie: (movieId: number) => void;
}

const COLUMNS = 4;
const GAP = 8;
// 처음에 보이는 편수 — 넘으면 제자리 펼치기(§9.5 ③). 서버가 전량을 주므로 재요청은 없다.
const PREVIEW_COUNT = 12;

// 연간 리포트 "올해 5점을 준 작품" 4열 그리드(docs/M2C2-report-spec.md §9.5).
// ⚠️ FlatList(numColumns)가 아니라 flexWrap View — 리포트가 한 화면 ScrollView라 그 안에 FlatList를 넣으면
// 중첩 VirtualizedList 경고가 난다. 셀 폭은 화면 폭이 아니라 SectionCard 내부 폭 기준이라 onLayout으로 잰다.
// 순서는 서버 순서(fiveStarDate 오름차순) 그대로 — 다시 정렬하지 않는다.
export function FiveStarGrid({ movies, onPressMovie }: FiveStarGridProps) {
  const [innerWidth, setInnerWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const cellWidth = innerWidth > 0 ? Math.floor((innerWidth - GAP * (COLUMNS - 1)) / COLUMNS) : 0;
  const hiddenCount = Math.max(movies.length - PREVIEW_COUNT, 0);
  const visible = expanded ? movies : movies.slice(0, PREVIEW_COUNT);

  return (
    <View onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width)}>
      {/* 측정 전(0)에는 그리지 않는다 — 폭 0 셀이 한 프레임 깔렸다가 튀는 것을 막는다 */}
      {cellWidth > 0 && (
        <View className="flex-row flex-wrap" style={{ columnGap: GAP, rowGap: GAP * 1.5 }}>
          {visible.map((m) => (
            <MovieGridItem
              key={m.movieId}
              id={m.movieId ?? 0}
              title={m.title ?? ''}
              posterPath={m.posterPath}
              width={cellWidth}
              // 360px 폰에서 셀이 약 75px — LIST(w342)는 낭비다
              posterSize="SHELF"
              showTitle
              onPress={() => m.movieId != null && onPressMovie(m.movieId)}
            />
          ))}
        </View>
      )}
      {hiddenCount > 0 && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          className="mt-3 flex-row items-center justify-center py-2"
        >
          <Txt variant="body" color="primary">
            {expanded ? '접기' : `더보기 (${hiddenCount})`}
          </Txt>
          {expanded ? (
            <ChevronUp size={18} color={colors.primary} />
          ) : (
            <ChevronDown size={18} color={colors.primary} />
          )}
        </Pressable>
      )}
    </View>
  );
}
