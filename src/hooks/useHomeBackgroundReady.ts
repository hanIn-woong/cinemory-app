import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { PosterSize, tmdbImageUrl } from '../constants/tmdb';
import { computePosterGrid } from '../utils/posterGrid';
import { APP_T0 } from '../utils/perf';
import { useHomeBackground } from './useHomeBackground';

// 실기기 계측(2026-09-12, §7.5) — 홈 배경 포스터 32장을 완전히 프리페치하는 데 4.1초
// 걸렸다. "제한 시간 내 최선 동시 공개"로 타협했더니 그 소수가 홈 화면 위에서 뒤늦게
// 팝인하는 모습이 나빴다 — 그래서 대기 자체를 앱 시작 로딩 화면으로 옮겼다(사용자 결정,
// 2026-09-12). 전용 로딩 화면에서는 팝인이 아예 안 보이므로 끝까지 기다려도 된다.
// 네트워크가 완전히 막힌 경우를 위한 안전망만 넉넉히 둔다 — 정상 경로에서는 거의 발동하지
// 않아야 한다(4.1초 실측보다 충분히 크게).
const SAFETY_TIMEOUT_MS = 8000;

// 앱 시작 시 홈 배경에 쓸 포스터를 전부 프리페치할 때까지 false를 반환한다. `useHomeBackground`
// 호출이 PosterBackdrop과 같은 쿼리 키를 쓰므로(react-query 캐시 공유) 여기서 미리 받아 둔
// 데이터를 PosterBackdrop이 다시 요청하지 않는다.
export function useHomeBackgroundReady(): boolean {
  const { width, height } = useWindowDimensions();
  const { cellsPerSet } = computePosterGrid(width, height);
  const posters = useHomeBackground(cellsPerSet);
  const [ready, setReady] = useState(false);

  // ⚠️ ready는 한 번 true가 되면 다시 false로 내려가지 않는다 — 로딩 화면은 "시작"
  // 화면이다. 로그인/로그아웃으로 signature가 나중에 바뀌면 이 이펙트는 다시 돌아
  // 새 포스터를 백그라운드로 프리페치하지만, 이미 화면에 들어간 사용자를 다시
  // 로딩 화면으로 내쫓지 않는다 — 그 경우의 팝인은 PosterBackdrop의 개별 transition이
  // 맡는다(빈도가 훨씬 낮은 이벤트라 이 정도 타협은 받아들인다).
  const signature = posters.map((p) => p.id).join(',');
  useEffect(() => {
    if (posters.length === 0) return; // 쿼리가 아직 안 끝났다 — signature가 바뀌면 재시도된다

    const uris = Array.from(
      new Set(
        posters.map((p) => tmdbImageUrl(p.posterPath, PosterSize.BACKDROP_TILE)).filter((u): u is string => !!u),
      ),
    );
    if (uris.length === 0) {
      setReady(true);
      return;
    }

    let cancelled = false;
    const prefetch = Promise.allSettled(uris.map((uri) => Image.prefetch(uri, 'memory-disk')));
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, SAFETY_TIMEOUT_MS));
    Promise.race([prefetch, timeout]).then(() => {
      console.log(`[boot] poster prefetch ready +${Date.now() - APP_T0}ms (${uris.length}장)`);
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // signature가 실질적인 의존성이다 — posters(배열 참조)는 매 렌더 새로 생성돼 무한 루프가 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return ready;
}
