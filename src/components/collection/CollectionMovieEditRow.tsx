import { CircleMinus, Equal } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Sortable from 'react-native-sortables';
import { PosterImage } from '../movie/PosterImage';
import { Txt } from '../primitives/Txt';
import { colors } from '../../theme/tokens';

// 2026-10-02 사용자 지시로 키움(76 → 100, 썸네일 40×60 → 56×84) — 3배 밀도에서 ~170px라 SHELF(w185) 그대로.
export const MOVIE_EDIT_ROW_HEIGHT = 100;
const THUMB_WIDTH = 56;
const DELETE_ACTION_WIDTH = 88;

interface CollectionMovieEditRowProps {
  id: number;
  title: string;
  posterPath?: string | null;
  subtitle?: string;
  sortable: boolean;
  onRemove: () => void;
  // 열린 삭제 버튼은 한 번에 하나만 — 열리기 직전에 부모가 이전 행을 닫는다.
  onWillOpen: (methods: SwipeableMethods) => void;
}

// 컬렉션 편집 화면의 한 행(2026-10-02, docs/M2C-screens-spec.md §5.3-A).
// ① 순서: 오른쪽 ≡ 핸들을 잡았을 때만 끌린다(Sortable.Grid customHandle) — 행의 다른 곳은 스크롤이라
//    "스크롤하려다 드래그가 걸리는" 일이 없고, 길게 누르기를 기다리지 않는다.
// ② 삭제: 왼쪽 ⊖를 탭하거나 행을 왼쪽으로 밀면 오른쪽에 "삭제"가 열린다. 어느 쪽이든 삭제를 한 번 더
//    눌러야 지워진다(iOS 기본 편집 목록과 같은 2단계). 실제 서버 반영은 화면의 "저장" 때.
export function CollectionMovieEditRow({ id, title, posterPath, subtitle, sortable, onRemove, onWillOpen }: CollectionMovieEditRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={DELETE_ACTION_WIDTH / 2}
      // 가로로 충분히 움직였을 때만 스와이프 — 세로 스크롤과 다툼을 줄인다.
      dragOffsetFromRightEdge={12}
      onSwipeableWillOpen={() => {
        if (swipeableRef.current) onWillOpen(swipeableRef.current);
      }}
      renderRightActions={() => (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`${title} 삭제`}
          className="items-center justify-center bg-destructive"
          style={{ width: DELETE_ACTION_WIDTH }}
        >
          <Txt variant="body" color="primaryForeground">
            삭제
          </Txt>
        </Pressable>
      )}
    >
      {/* 배경을 칠한다 — 투명하면 밀 때 뒤의 삭제 버튼이 행 내용과 겹쳐 보인다 */}
      <View className="flex-row items-center bg-background px-4" style={{ height: MOVIE_EDIT_ROW_HEIGHT }}>
        <Pressable
          onPress={() => swipeableRef.current?.openRight()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${title} 삭제 버튼 열기`}
        >
          <CircleMinus size={24} color={colors.destructive} />
        </Pressable>
        <View className="ml-3">
          <PosterImage id={id} posterPath={posterPath} width={THUMB_WIDTH} height={THUMB_WIDTH * 1.5} size="SHELF" radius={4} />
        </View>
        <View className="ml-3 flex-1">
          <Txt variant="body" numberOfLines={2}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt variant="caption" color="mutedForeground" numberOfLines={1} className="mt-0.5">
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {sortable && (
          <Sortable.Handle>
            <View className="py-3 pl-4" accessibilityLabel={`${title} 순서 바꾸기`}>
              <Equal size={26} color={colors.mutedForeground} />
            </View>
          </Sortable.Handle>
        )}
      </View>
    </ReanimatedSwipeable>
  );
}
