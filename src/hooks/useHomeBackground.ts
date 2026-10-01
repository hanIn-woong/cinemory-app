import { useQueries, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { recordApi } from '../api/record';
import { PosterSize, tmdbImageUrl } from '../constants/tmdb';
import { useAuthStore } from '../store/authStore';
import { POSTER_GRID_COLUMNS, effectiveStripCount, type PosterGrid } from '../utils/posterGrid';
import { useRandomMovies } from './useMovies';
import { queryKeys } from './queryKeys';

// 백엔드 `cinemory.movie.random.max-size`와 맞춘다 — 이보다 큰 격자는 셀당 유일한 포스터를
// 보장할 수 없다(그 이상은 극히 드문 화면 크기라 감내한다).
const MAX_POOL = 50;

const BACKGROUND_STALE_TIME = 5 * 60 * 1000; // 배경 포스터는 30초(전역)마다 갱신될 이유가 없다

export interface HomeBackgroundPoster {
  id: number;
  posterPath?: string | null;
}

// 홈 배경의 포스터 소스(docs/M2-frontend-spec.md §9.1, 2026-10-02 개정).
//  - conveyor: 로그인 + 기록이 **화면 한 장 분량(cellsPerSet) 이상** — 기록만 쓴다. 화면 한 장
//    크기의 페이지를 차례로 받아 붙이고, 끝에 닿으면 처음 기록으로 돌아간다. 랜덤을 섞지 않는다.
//  - loop: 그 외(게스트·기록 부족·0건) — 랜덤 영화(B-17) 화면 2장 분량을 반복한다.
//    ⚠️ 기록 0건인 신규 가입자를 반드시 여기로 보낸다 — 가입 직후 배경이 비면 안 된다.
//  - pending: 어느 쪽인지 아직 모른다(로그인 사용자의 기록 첫 페이지 대기).
export type HomeBackgroundSource =
  | { kind: 'pending' }
  | { kind: 'loop'; posters: HomeBackgroundPoster[] }
  | { kind: 'conveyor'; userId: number; pageSize: number; total: number };

export function useHomeBackgroundSource(grid: PosterGrid): HomeBackgroundSource {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id) ?? 0;
  const pageSize = grid.cellsPerSet;

  // 컨베이어 0번 페이지와 같은 쿼리 키 — 판정용 totalElements와 첫 묶음을 한 번에 얻는다.
  const firstPage = useQuery({
    queryKey: queryKeys.records.homeBackgroundPage(userId, pageSize, 0),
    queryFn: () => recordApi.ofUser(userId, 0, pageSize),
    enabled: isAuthed,
    staleTime: BACKGROUND_STALE_TIME,
  });

  // 기록 판정을 기다리지 않고 항상 병렬로 쏜다 — 기록이 충분한 사용자에게는 53~73ms짜리
  // permitAll GET 하나가 낭비되지만, 기록 부족 사용자(신규 가입자 대부분)의 임계경로에서
  // 왕복 한 번이 사라진다(§7.5).
  const random = useRandomMovies(Math.min(grid.uniqueCount, MAX_POOL));

  if (isAuthed && firstPage.isPending) return { kind: 'pending' };
  const total = firstPage.data?.totalElements ?? 0;
  if (isAuthed && !firstPage.isError && total >= pageSize) {
    return { kind: 'conveyor', userId, pageSize, total };
  }
  if (random.isPending) return { kind: 'pending' };
  return { kind: 'loop', posters: (random.data ?? []).map((m) => ({ id: m.id!, posterPath: m.posterPath })) };
}

// 배경의 정체 — 바뀌면 크로스페이드 대상이다. ⚠️ 컨베이어는 사용자 단위로만 본다(묶음이
// 넘어가거나 total이 바뀔 때마다 페이드하면 안 된다).
export function sourceSignature(source: HomeBackgroundSource): string {
  if (source.kind === 'loop') return `loop:${source.posters.map((p) => p.id).join(',')}`;
  if (source.kind === 'conveyor') return `conveyor:${source.userId}`;
  return 'pending';
}

// 화면에 나오는 순서대로 앞쪽 두 화면분(반복: 띠, 컨베이어: 묶음 0+1). null = 아직 데이터 대기 중.
// 부팅 게이트와 PosterBackdrop의 소스 전환 게이트가 같은 기준으로 "첫 화면이 준비됐다"를 판정한다.
export function useLeadingPosters(
  grid: PosterGrid,
  source: HomeBackgroundSource,
): (HomeBackgroundPoster | undefined)[] | null {
  const [batch0, batch1] = useConveyorBatches(source, [0, 1]);
  if (source.kind === 'loop') {
    const list = source.posters;
    if (list.length === 0) return [];
    const strip = effectiveStripCount(grid, list.length);
    return Array.from({ length: strip }, (_, i) => list[i % strip % list.length]);
  }
  if (source.kind === 'conveyor' && batch0 && batch1) return [...batch0, ...batch1];
  return null;
}

// 앞쪽 포스터 중 첫 화면 + 1행을 받아 둔 뒤 resolve하고, 나머지는 그 뒤에 백그라운드로 받는다.
// +1행인 이유: rows가 ceil이라 다음 화면 첫 행은 스크롤 1행 미만(최악 수 초)에 화면 아래로 들어온다.
// 나머지를 동시에 쏘지 않는 이유: 호스트당 동시 연결을 나눠 써서 첫 화면이 그만큼 늦어진다(§7.5).
export function prefetchLeading(
  grid: PosterGrid,
  posters: (HomeBackgroundPoster | undefined)[],
  isCancelled: () => boolean,
): Promise<number> {
  const bootCount = grid.cellsPerSet + POSTER_GRID_COLUMNS;
  const toUris = (list: (HomeBackgroundPoster | undefined)[]) =>
    list.map((p) => tmdbImageUrl(p?.posterPath, PosterSize.BACKDROP_TILE)).filter((u): u is string => !!u);
  const bootUris = Array.from(new Set(toUris(posters.slice(0, bootCount))));
  const restUris = Array.from(new Set(toUris(posters.slice(bootCount)))).filter((u) => !bootUris.includes(u));
  return Promise.allSettled(bootUris.map((uri) => Image.prefetch(uri, 'memory-disk'))).then(() => {
    if (!isCancelled()) restUris.forEach((uri) => Image.prefetch(uri, 'memory-disk'));
    return bootUris.length;
  });
}

// 묶음 k가 보여 줄 기록 위치들 — 기록 목록을 원형으로 보고 k번째 화면분을 자른다.
// 마지막 페이지가 덜 찼으면 처음 기록으로 이어 채운다. total ≥ pageSize라 한 화면 안에
// 같은 기록이 두 번 나오지 않는다(화면에 동시에 보이는 칸 수 ≤ pageSize).
function batchPositions(k: number, pageSize: number, total: number): number[] {
  return Array.from({ length: pageSize }, (_, j) => (k * pageSize + j) % total);
}

// undefined = 그 묶음에 필요한 페이지가 아직 안 왔다. 배열 안의 undefined = 페이지는 왔는데
// 그 자리에 기록이 없다(받은 뒤 기록이 삭제돼 페이지가 짧아진 경우) — 칸은 폴백 색으로 그린다.
export type ConveyorBatch = (HomeBackgroundPoster | undefined)[] | undefined;

export function useConveyorBatches(source: HomeBackgroundSource, batchIndices: number[]): ConveyorBatch[] {
  const conveyor = source.kind === 'conveyor' ? source : null;
  // ⚠️ 로그아웃 직후에도 PosterBackdrop은 새 배경이 준비될 때까지 **이전 사용자의 컨베이어**를
  // 보여 준다. 그동안 다음 페이지를 요청하면 비로그인 상태로 남의 기록을 부르게 된다(로그아웃은
  // 쿼리 캐시를 비운다) — 지금 로그인한 사용자의 소스일 때만 요청한다. 이미 채운 묶음은 얼려 둬서
  // 그대로 보인다.
  const authUserId = useAuthStore((s) => (s.status === 'authenticated' ? s.user?.id : undefined));
  const canFetch = conveyor !== null && conveyor.userId === authUserId;
  const positionsByBatch = conveyor
    ? batchIndices.map((k) => batchPositions(k, conveyor.pageSize, conveyor.total))
    : [];
  const pages = conveyor
    ? Array.from(new Set(positionsByBatch.flat().map((pos) => Math.floor(pos / conveyor.pageSize)))).sort(
        (a, b) => a - b,
      )
    : [];

  const results = useQueries({
    queries: pages.map((page) => ({
      queryKey: queryKeys.records.homeBackgroundPage(conveyor!.userId, conveyor!.pageSize, page),
      queryFn: () => recordApi.ofUser(conveyor!.userId, page, conveyor!.pageSize),
      enabled: canFetch,
      staleTime: BACKGROUND_STALE_TIME,
    })),
  });

  if (!conveyor) return batchIndices.map(() => undefined);
  const contentByPage = new Map(pages.map((page, i) => [page, results[i]?.data?.content]));

  return positionsByBatch.map((positions) => {
    const needed = new Set(positions.map((pos) => Math.floor(pos / conveyor.pageSize)));
    if ([...needed].some((page) => !contentByPage.get(page))) return undefined;
    return positions.map((pos) => {
      const item = contentByPage.get(Math.floor(pos / conveyor.pageSize))?.[pos % conveyor.pageSize];
      return item ? { id: item.movieId!, posterPath: item.posterPath } : undefined;
    });
  });
}
