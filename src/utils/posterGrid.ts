export const POSTER_GRID_COLUMNS = 4;
export const POSTER_GRID_GAP = 4;

// 고유 포스터 수 상한 — 백엔드 `cinemory.movie.random.max-size`(50) 이하이면서 열 수의 배수여야
// 띠(strip)가 행 단위로 딱 떨어진다.
const UNIQUE_POSTER_CAP = 48;

export interface PosterGrid {
  cellWidth: number;
  cellHeight: number;
  rowHeight: number;
  rows: number;
  setHeight: number;
  // 화면 한 장을 채우는 칸 수 — 시작 로딩 화면이 기다리는 기준.
  cellsPerSet: number;
  // 한 바퀴에 나오는 고유 포스터 수의 목표치 — 화면 2장 분량(상한 48). 실제 띠 길이는 받은
  // 포스터 수에 따라 effectiveStripCount가 정한다.
  uniqueCount: number;
}

// PosterBackdrop과 부팅 시 프리페치 게이트(useHomeBackgroundReady)가 같은 값을 계산해야
// 한다 — 다르면 한쪽이 채워 둔 포스터 풀이 다른 쪽 화면을 못 채운다(§7.5).
export function computePosterGrid(width: number, height: number): PosterGrid {
  const cellWidth = (width - POSTER_GRID_GAP * (POSTER_GRID_COLUMNS + 1)) / POSTER_GRID_COLUMNS;
  const cellHeight = cellWidth * 1.5; // TMDB 포스터 비율 2:3
  const rowHeight = cellHeight + POSTER_GRID_GAP;
  const rows = Math.ceil(height / rowHeight);
  const setHeight = rows * rowHeight;
  const cellsPerSet = rows * POSTER_GRID_COLUMNS;
  // ⚠️ cellsPerSet보다 작아지면 안 된다 — 띠 끝의 이음매 구간(첫 화면 복제)이 띠보다 길어져
  // 같은 포스터가 한 화면에 두 번 보인다. 화면이 아주 커서 상한을 넘으면 한 장 분량으로 둔다.
  const uniqueCount = Math.max(cellsPerSet, Math.min(cellsPerSet * 2, UNIQUE_POSTER_CAP));
  return { cellWidth, cellHeight, rowHeight, rows, setHeight, cellsPerSet, uniqueCount };
}

// 반복(loop) 방식에서 실제로 받은 포스터 수에 맞춘 띠 길이(칸 수). 랜덤 응답이 요청보다 적게
// 와도 가진 만큼만 띠를 만든다 — ⚠️ 반드시 열 수의 배수로 내림하고 posters.length 이하여야 한다. 그래야
// `posters[i % strip]`이 행 경계에서 어긋나 첫 행·마지막 행이 중복되는 버그(2026-09-06)가 안 난다.
// 한 화면도 못 채우는 경우(랜덤 응답이 모자란 예외 경로)는 예전처럼 uniqueCount를 그대로 쓴다.
export function effectiveStripCount(grid: PosterGrid, posterCount: number): number {
  if (posterCount < grid.cellsPerSet) return grid.uniqueCount;
  const capped = Math.min(posterCount, grid.uniqueCount);
  return capped - (capped % POSTER_GRID_COLUMNS);
}
