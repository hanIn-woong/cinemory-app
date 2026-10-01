import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { PosterSize, tmdbImageUrl } from '../../constants/tmdb';
import {
  prefetchLeading,
  sourceSignature,
  useConveyorBatches,
  useHomeBackgroundSource,
  useLeadingPosters,
  type HomeBackgroundPoster,
  type HomeBackgroundSource,
} from '../../hooks/useHomeBackground';
import { posterFallbackPalette, radius } from '../../theme/tokens';
import {
  POSTER_GRID_COLUMNS,
  POSTER_GRID_GAP,
  computePosterGrid,
  effectiveStripCount,
  type PosterGrid,
} from '../../utils/posterGrid';

// 화면 한 장 높이를 지나는 데 걸리는 시간 — 흐르는 속도. 두 방식 모두 같다.
const SET_SCROLL_MS = 60000;
const FADE_MS = 250;
const REST_OPACITY = 0.2;
// 컨베이어 한 번의 withTiming이 흐르는 화면 수(10시간) — 끝나면 이어서 다시 건다.
const CONVEYOR_RUN_SETS = 600;
const SWITCH_TIMEOUT_MS = 8000;

// ① 배경 — 4열 그리드 · 화면 한 장/60초 속도로 위로 흐른다 · 소스는 useHomeBackgroundSource가
// 정한다(docs/M2-frontend-spec.md §9.1). blur는 라이브러리 없이 작은 원본(w92)을 큰 셀에 넣는
// 업스케일로 대신한다 — expo-blur는 Android 성능 이슈로 마지막 수단이다.
//  - loop(게스트·기록 부족): 랜덤 화면 2장 분량을 반복한다.
//  - conveyor(기록 충분): 지나간 화면분을 버리고 다음 기록을 이어 붙인다. 끝나면 처음 기록으로.
//
// ⚠️ 첫 화면분 프리페치는 여기서 하지 않는다 — 앱 시작 시 `useHomeBackgroundReady`(App.tsx)가
// 끝내 둔 뒤에야 이 컴포넌트가 마운트된다(§7.5). 여기서는 컨베이어의 **앞으로 올** 묶음만 미리 받는다.
export function PosterBackdrop() {
  const { width, height } = useWindowDimensions();
  const grid = computePosterGrid(width, height);
  const latest = useHomeBackgroundSource(grid);
  const latestSignature = sourceSignature(latest);
  const opacity = useSharedValue(0);

  // 소스 전환 게이트(2026-10-02) — 로그인/로그아웃·랜덤 갱신으로 소스가 바뀌면, 새 소스의
  // 첫 화면 + 1행을 받아 둘 때까지 **이전 배경을 그대로 보여 주고** 그 뒤에 바꾼다. 부팅 때만
  // 로딩 화면으로 막고 이 흐름은 막지 않아서, 로그아웃 후 홈에 오면 포스터 일부가 늦게 떴다.
  // 로딩 화면으로 되돌려 보내지 않는 이유는 9/12 결정(로그인할 때마다 쫓아내지 않는다) 그대로.
  // 같은 정체(signature)면 게이트 없이 최신 값을 쓴다 — 컨베이어의 total 갱신 등.
  const [shown, setShown] = useState<HomeBackgroundSource>(latest);
  const shownSignature = sourceSignature(shown);
  const switching = latestSignature !== shownSignature;
  const leading = useLeadingPosters(grid, latest);
  const leadingSignature = leading === null ? null : leading.map((p) => p?.id ?? '-').join(',');
  const latestRef = useRef(latest);
  latestRef.current = latest;

  useEffect(() => {
    if (!switching || leading === null) return;
    let cancelled = false;
    const commit = () => {
      if (!cancelled) setShown(latestRef.current);
    };
    // 네트워크가 막혀도 이전 배경에 갇히지 않게 — 부팅 안전망과 같은 값.
    const timer = setTimeout(commit, SWITCH_TIMEOUT_MS);
    prefetchLeading(grid, leading, () => cancelled).then(commit);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // 두 signature가 실질적인 의존성이다 — leading·grid는 매 렌더 새로 생성된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switching, latestSignature, leadingSignature]);

  const source = switching ? shown : latest;

  // 보여 주는 배경의 정체가 바뀌면 크로스페이드한다. 정지 투명도(0.2)와 같은 채널을 써서
  // 최초 로드도 자연스럽게 페이드인된다.
  const signature = sourceSignature(source);
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(REST_OPACITY, { duration: FADE_MS });
    // signature가 실질적인 의존성이다 — opacity(shared value)는 매 렌더 안정적이라 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="absolute inset-0 overflow-hidden bg-background" pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        {source.kind === 'loop' && <LoopStrip grid={grid} posters={source.posters} />}
        {source.kind === 'conveyor' && <ConveyorStrip key={source.userId} grid={grid} source={source} />}
      </Animated.View>
    </View>
  );
}

// 게스트·기록 부족 — 고유 띠 뒤에 첫 화면을 한 번 더 깔고 띠 높이만큼 올린 뒤 처음으로
// 되돌린다(이음매가 안 보인다). 내용은 바뀌지 않으므로 되돌리는 순간이 튀지 않는다.
function LoopStrip({ grid, posters }: { grid: PosterGrid; posters: HomeBackgroundPoster[] }) {
  const { rowHeight, setHeight, cellsPerSet } = grid;
  // 띠 길이는 받은 포스터 수에 맞춘다(행 중복 방지 규칙은 effectiveStripCount 주석).
  const stripCount = effectiveStripCount(grid, posters.length);
  const stripHeight = (stripCount / POSTER_GRID_COLUMNS) * rowHeight;
  const cycleMs = (SET_SCROLL_MS * stripHeight) / setHeight;
  const translateY = useSharedValue(0);

  // ⚠️ 탭을 떠나면 애니메이션을 멈춘다 — 안 하면 다른 탭에 있는 동안에도 루프가 계속 돈다.
  // 세 번째 인자는 반드시 false — true면 위아래로 왕복해서 어색하게 튄다.
  useFocusEffect(
    useCallback(() => {
      translateY.value = 0;
      translateY.value = withRepeat(withTiming(-stripHeight, { duration: cycleMs, easing: Easing.linear }), -1, false);
      return () => cancelAnimation(translateY);
    }, [translateY, stripHeight, cycleMs]),
  );
  const scrollStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View className="flex-row flex-wrap" style={[{ padding: POSTER_GRID_GAP }, scrollStyle]}>
      {Array.from({ length: stripCount + cellsPerSet }, (_, i) => (
        <PosterCell
          key={i}
          grid={grid}
          index={i}
          poster={posters.length > 0 ? posters[i % stripCount % posters.length] : undefined}
        />
      ))}
    </Animated.View>
  );
}

// 기록 충분 — 컨베이어. 묶음 k(화면 한 장분)를 절대 위치 k × setHeight에 두고, 스크롤은
// **되돌리지 않고 계속 흐르게** 한다. 지금 보이는 묶음 n 기준으로 n, n+1, n+2만 그린다.
// ⚠️ 되돌리는 루프에서 내용을 바꾸면, 위치 리셋(UI 스레드)과 내용 교체(JS 렌더)가 한 프레임만
// 어긋나도 화면이 튄다. 여기서는 붙이고 떼는 일이 **모두 화면 밖**에서 일어난다 —
// n-1은 이미 위로 완전히 나갔고(offset ≥ n·S), n+2는 아직 아래에 있다(보이는 끝 ≤ (n+2)·S,
// 화면 높이 ≤ setHeight). 그래서 JS 반응이 몇 프레임 늦어도 보이지 않는다.
function ConveyorStrip({
  grid,
  source,
}: {
  grid: PosterGrid;
  source: Extract<HomeBackgroundSource, { kind: 'conveyor' }>;
}) {
  const { setHeight } = grid;
  const offset = useSharedValue(0);
  const [current, setCurrent] = useState(0);

  useAnimatedReaction(
    () => Math.floor(offset.value / setHeight),
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setCurrent, now);
    },
    [setHeight],
  );

  // 탭을 떠나면 멈추고, 돌아오면 **그 자리에서** 이어 흐른다(처음으로 되돌리지 않는다).
  useFocusEffect(
    useCallback(() => {
      const run = () => {
        offset.value = withTiming(
          offset.value + setHeight * CONVEYOR_RUN_SETS,
          { duration: SET_SCROLL_MS * CONVEYOR_RUN_SETS, easing: Easing.linear },
          (finished) => {
            if (finished) scheduleOnRN(run);
          },
        );
      };
      run();
      return () => cancelAnimation(offset);
    }, [offset, setHeight]),
  );
  const scrollStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -offset.value }] }));

  const indices = [current, current + 1, current + 2];
  const batches = useConveyorBatches(source, indices);

  // ⚠️ 한 번 채운 묶음은 얼린다 — 기록이 추가·삭제되면 ['records'] 무효화로 페이지가 다시 오는데,
  // 그대로 반영하면 기록이 한 칸씩 밀려 **보이는 묶음의 포스터가 통째로 바뀐다.** 새 데이터는
  // 앞으로 붙을 묶음부터 반영된다.
  const frozen = useRef(new Map<number, (HomeBackgroundPoster | undefined)[]>());
  indices.forEach((k, i) => {
    const batch = batches[i];
    if (batch && !frozen.current.has(k)) frozen.current.set(k, batch);
  });
  for (const k of frozen.current.keys()) if (k < current) frozen.current.delete(k);

  // 화면 아래 바깥의 n+2를 미리 받는다 — 화면에 들어오기까지 약 60초 여유가 있다.
  const upcoming = frozen.current.get(current + 2);
  const upcomingSignature = upcoming?.map((p) => p?.id ?? '-').join(',');
  useEffect(() => {
    upcoming?.forEach((p) => {
      const uri = tmdbImageUrl(p?.posterPath, PosterSize.BACKDROP_TILE);
      if (uri) Image.prefetch(uri, 'memory-disk');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingSignature]);

  return (
    // 높이를 실제 내용만큼 준다 — 부모 밖으로 넘친 자식의 렌더를 플랫폼 기본값에 맡기지 않는다.
    <Animated.View style={[{ height: (current + 3) * setHeight + POSTER_GRID_GAP }, scrollStyle]}>
      {indices.map((k) => {
        const batch = frozen.current.get(k);
        if (!batch) return null;
        return (
          <View
            key={k}
            className="absolute flex-row flex-wrap"
            style={{ top: POSTER_GRID_GAP + k * setHeight, left: POSTER_GRID_GAP, right: POSTER_GRID_GAP }}
          >
            {batch.map((poster, i) => (
              <PosterCell key={i} grid={grid} index={i} poster={poster} />
            ))}
          </View>
        );
      })}
    </Animated.View>
  );
}

function PosterCell({
  grid,
  index,
  poster,
}: {
  grid: PosterGrid;
  index: number;
  poster: HomeBackgroundPoster | undefined;
}) {
  const uri = poster ? tmdbImageUrl(poster.posterPath, PosterSize.BACKDROP_TILE) : null;
  // ⚠️ 마지막 열에도 marginRight를 주면 한 행의 총 너비가 컨테이너보다 GAP만큼 커져
  // flex-wrap이 4번째 셀을 다음 줄로 밀어낸다 — 4열이 3열로 보이던 원인(실기기 확인).
  // gap은 열 "사이"에만 필요하다.
  const isLastColumn = index % POSTER_GRID_COLUMNS === POSTER_GRID_COLUMNS - 1;
  const cellStyle = {
    width: grid.cellWidth,
    height: grid.cellHeight,
    marginRight: isLastColumn ? 0 : POSTER_GRID_GAP,
    marginBottom: POSTER_GRID_GAP,
    borderRadius: radius.sm,
  };

  if (!uri) {
    // 결정론적 폴백 색 — Math.random()이면 매 렌더마다 깜빡인다(§4).
    const color = posterFallbackPalette[Math.abs(poster?.id ?? index) % posterFallbackPalette.length];
    return <View style={[cellStyle, { backgroundColor: color }]} />;
  }
  return (
    <Image
      source={uri}
      style={cellStyle}
      contentFit="cover"
      cachePolicy="memory-disk"
      // 첫 화면분은 부팅 로딩 화면에서, 다음 묶음은 미리 받아 둬 캐시 히트로 즉시 뜬다.
      // transition은 로그인/로그아웃 등으로 아직 캐시에 없는 드문 경우를 위한 보험이다.
      transition={150}
      recyclingKey={poster ? String(poster.id) : undefined}
    />
  );
}
