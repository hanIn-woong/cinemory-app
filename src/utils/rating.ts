// 변환은 이 파일 밖에서 하지 않는다 (docs/M2B-screens-spec.md §4.1).
// 백엔드는 Double 0.0~10.0, UI는 별 5개(반개 단위) — 8.0 ⇄ 4.0.
export const apiToStars = (r: number) => r / 2;
export const starsToApi = (s: number) => s * 2;
