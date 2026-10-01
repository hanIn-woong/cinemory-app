import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { computePosterGrid } from '../utils/posterGrid';
import { APP_T0 } from '../utils/perf';
import { prefetchLeading, useHomeBackgroundSource, useLeadingPosters } from './useHomeBackground';

// 실기기 계측(2026-09-12, §7.5) — 홈 배경 포스터 32장을 완전히 프리페치하는 데 4.1초
// 걸렸다. "제한 시간 내 최선 동시 공개"로 타협했더니 그 소수가 홈 화면 위에서 뒤늦게
// 팝인하는 모습이 나빴다 — 그래서 대기 자체를 앱 시작 로딩 화면으로 옮겼다(사용자 결정,
// 2026-09-12). 전용 로딩 화면에서는 팝인이 아예 안 보이므로 끝까지 기다려도 된다.
// 네트워크가 완전히 막힌 경우를 위한 안전망만 넉넉히 둔다 — 정상 경로에서는 거의 발동하지
// 않아야 한다(4.1초 실측보다 충분히 크게).
// ⚠️ 안전망은 **마운트 시점**부터 잰다 — 포스터 쿼리 자체가 실패·지연(백엔드 IP 불일치,
// 오프라인)하면 posters가 계속 비어 프리페치 단계에 도달하지 못한다. 예전엔 타이머를
// 프리페치 단계에서 걸어서 바로 그 상황에 로딩 화면이 영구 정지했다(2026-09-24 실기기).
const SAFETY_TIMEOUT_MS = 8000;

// 앱 시작 시 홈 배경의 **첫 화면 + 1행**을 프리페치할 때까지 false를 반환한다(2026-10-02 —
// 이전엔 전부). 소스 훅들이 PosterBackdrop과 같은 쿼리 키를 쓰므로(react-query 캐시 공유) 여기서
// 미리 받아 둔 데이터를 PosterBackdrop이 다시 요청하지 않는다. 기다리는 범위의 근거는
// prefetchLeading 주석. 이후 로그인/로그아웃으로 소스가 바뀔 때는 PosterBackdrop이 같은 기준으로
// 이전 배경을 유지한 채 기다린다(이 게이트는 다시 닫히지 않는다).
export function useHomeBackgroundReady(): boolean {
  const { width, height } = useWindowDimensions();
  const grid = computePosterGrid(width, height);
  const source = useHomeBackgroundSource(grid);
  const posters = useLeadingPosters(grid, source);
  const [ready, setReady] = useState(false);

  // ⚠️ ready는 한 번 true가 되면 다시 false로 내려가지 않는다 — 로딩 화면은 "시작" 화면이다.
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log(`[boot] safety timeout +${Date.now() - APP_T0}ms — 포스터 준비 전에 진입`);
      setReady(true);
    }, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const signature = posters === null ? null : posters.map((p) => p?.id ?? '-').join(',');
  useEffect(() => {
    if (posters === null || ready) return; // 데이터 대기 중이거나 이미 열렸다
    let cancelled = false;
    // 시간 상한은 위의 마운트 타이머가 맡는다 — 여기서 따로 race하지 않는다.
    prefetchLeading(grid, posters, () => cancelled).then((count) => {
      console.log(`[boot] poster prefetch ready +${Date.now() - APP_T0}ms (${count}장)`);
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
