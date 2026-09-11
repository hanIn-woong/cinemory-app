import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useCallback, useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PosterSize, tmdbImageUrl } from '../../constants/tmdb';
import { useHomeBackground, type HomeBackgroundPoster } from '../../hooks/useHomeBackground';
import { posterFallbackPalette, radius } from '../../theme/tokens';
import { POSTER_GRID_COLUMNS, POSTER_GRID_GAP, computePosterGrid } from '../../utils/posterGrid';

const CYCLE_MS = 60000;
const FADE_MS = 250;
const REST_OPACITY = 0.2;

// ① 배경 — 4열 그리드 · 60초 무한 상향 루프 · 소스는 useHomeBackground가 정한다
// (docs/M2-frontend-spec.md §9.1). blur는 라이브러리 없이 작은 원본(w92)을 큰 셀에 넣는
// 업스케일로 대신한다 — expo-blur는 Android 성능 이슈로 마지막 수단이다.
//
// ⚠️ 프리페치는 여기서 하지 않는다 — 앱 시작 시 `useHomeBackgroundReady`(App.tsx)가 이미
// 전부 끝내 둔 뒤에야 이 컴포넌트가 마운트된다. 여기서 다시 게이트를 걸면 로그인/로그아웃
// 처럼 소스가 바뀌는 드문 경우까지 매번 로딩 화면을 띄우게 돼 배보다 배꼽이 커진다(§7.5,
// 2026-09-12 — "시작 로딩 화면"으로 대기를 옮기고 이 컴포넌트는 단순 렌더로 되돌렸다).
export function PosterBackdrop() {
  const { width, height } = useWindowDimensions();
  const { cellWidth, cellHeight, setHeight, cellsPerSet } = computePosterGrid(width, height);

  // ⚠️ 한 세트(cellsPerSet)를 채울 만큼은 반드시 받아 온다 — 그보다 적으면 순환이 행 경계와
  // 맞아떨어져 첫 행과 마지막 행이 그대로 중복된다(useHomeBackground 주석 참고).
  const posters = useHomeBackground(cellsPerSet);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  // ⚠️ 탭을 떠나면 애니메이션을 멈춘다 — 안 하면 다른 탭에 있는 동안에도 60초 루프가
  // 계속 돈다. 세 번째 인자는 반드시 false — true면 위아래로 왕복해서 어색하게 튄다.
  useFocusEffect(
    useCallback(() => {
      translateY.value = 0;
      translateY.value = withRepeat(withTiming(-setHeight, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
      return () => cancelAnimation(translateY);
    }, [translateY, setHeight]),
  );

  // 로그인/로그아웃으로 소스가 바뀌면 배경이 뚝 바뀌지 않도록 크로스페이드한다. 정지
  // 투명도(0.2)와 같은 채널을 써서 최초 로드도 자연스럽게 페이드인된다.
  const signature = posters.map((p) => p.id).join(',');
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(REST_OPACITY, { duration: FADE_MS });
    // signature가 실질적인 의존성이다 — opacity(shared value)는 매 렌더 안정적이라 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const cells = Array.from({ length: cellsPerSet * 2 }, (_, i) => {
    const poster: HomeBackgroundPoster | undefined =
      posters.length > 0 ? posters[i % cellsPerSet % posters.length] : undefined;
    const uri = poster ? tmdbImageUrl(poster.posterPath, PosterSize.BACKDROP_TILE) : null;
    // ⚠️ 마지막 열에도 marginRight를 주면 한 행의 총 너비가 컨테이너보다 GAP만큼 커져
    // flex-wrap이 4번째 셀을 다음 줄로 밀어낸다 — 4열이 3열로 보이던 원인(실기기 확인).
    // gap은 열 "사이"에만 필요하다.
    const isLastColumn = i % POSTER_GRID_COLUMNS === POSTER_GRID_COLUMNS - 1;
    const cellStyle = {
      width: cellWidth,
      height: cellHeight,
      marginRight: isLastColumn ? 0 : POSTER_GRID_GAP,
      marginBottom: POSTER_GRID_GAP,
      borderRadius: radius.sm,
    };

    if (!uri) {
      // 결정론적 폴백 색 — Math.random()이면 매 렌더마다 깜빡인다(§4).
      const color = posterFallbackPalette[Math.abs(poster?.id ?? i) % posterFallbackPalette.length];
      return <View key={i} style={[cellStyle, { backgroundColor: color }]} />;
    }
    return (
      <Image
        key={i}
        source={uri}
        style={cellStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        // 이 컴포넌트가 마운트될 때는 앱 시작 로딩 화면에서 이미 프리페치가 끝난 뒤라
        // 캐시 히트로 사실상 즉시 뜬다. transition은 로그인/로그아웃으로 소스가 바뀌어
        // 아직 캐시에 없는 드문 경우를 위한 보험이다.
        transition={150}
        recyclingKey={poster ? String(poster.id) : undefined}
      />
    );
  });

  return (
    <View className="absolute inset-0 overflow-hidden bg-background" pointerEvents="none">
      <Animated.View
        className="flex-row flex-wrap"
        style={[{ padding: POSTER_GRID_GAP }, animatedStyle]}
      >
        {cells}
      </Animated.View>
    </View>
  );
}
