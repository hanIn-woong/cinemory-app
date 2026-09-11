export const POSTER_GRID_COLUMNS = 4;
export const POSTER_GRID_GAP = 4;

export interface PosterGrid {
  cellWidth: number;
  cellHeight: number;
  rows: number;
  setHeight: number;
  cellsPerSet: number;
}

// PosterBackdrop과 부팅 시 프리페치 게이트(useHomeBackgroundReady)가 같은 셀 수를 계산해야
// 한다 — 다르면 한쪽이 채워 둔 포스터 풀이 다른 쪽 화면을 못 채운다(§7.5).
export function computePosterGrid(width: number, height: number): PosterGrid {
  const cellWidth = (width - POSTER_GRID_GAP * (POSTER_GRID_COLUMNS + 1)) / POSTER_GRID_COLUMNS;
  const cellHeight = cellWidth * 1.5; // TMDB 포스터 비율 2:3
  const rows = Math.ceil(height / (cellHeight + POSTER_GRID_GAP));
  const setHeight = rows * (cellHeight + POSTER_GRID_GAP);
  const cellsPerSet = rows * POSTER_GRID_COLUMNS;
  return { cellWidth, cellHeight, rows, setHeight, cellsPerSet };
}
