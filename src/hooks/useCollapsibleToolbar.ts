import { useCallback } from 'react';
import { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// 미세한 손떨림 스크롤에 반응하지 않게 하는 델타 임계값(px).
const HIDE_DELTA = 8;
const ANIMATION_MS = 200;

// 화면 안 툴바(그리드/리스트 토글 등) 접기 — 네이티브 스택 헤더는 건드리지 않는다
// (docs/M2B-screens-spec.md §5.5 "스크롤 시 툴바 접기"). 위치 기반이 아니라 방향 기반 —
// 위로 스크롤(delta<0)하면 바로 다시 보인다.
export function useCollapsibleToolbar(toolbarHeight: number) {
  const translateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const scrollY = event.contentOffset.y;
      const delta = scrollY - lastScrollY.value;

      if (scrollY <= toolbarHeight) {
        // ⚠️ 짧은 목록 방어 — 이 줄이 없으면 툴바를 숨긴 뒤 되돌릴 스크롤이 없어 영영 안 보인다.
        translateY.value = withTiming(0, { duration: ANIMATION_MS });
      } else if (delta > HIDE_DELTA) {
        translateY.value = withTiming(-toolbarHeight, { duration: ANIMATION_MS });
      } else if (delta < -HIDE_DELTA) {
        translateY.value = withTiming(0, { duration: ANIMATION_MS });
      }

      lastScrollY.value = scrollY;
    },
  });

  const toolbarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ⚠️ FlatList를 key로 재생성(그리드↔리스트 토글)하면 스크롤은 0으로 가는데 이 훅의
  // 상태는 그대로라 툴바가 숨김에 굳는다 — 토글 시 화면에서 이 reset()을 불러야 한다.
  const reset = useCallback(() => {
    translateY.value = 0;
    lastScrollY.value = 0;
  }, [translateY, lastScrollY]);

  return { onScroll, toolbarStyle, reset };
}
