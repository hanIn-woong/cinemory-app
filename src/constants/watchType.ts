import { colors } from '../theme/tokens';

// watchTypeDistribution의 4번째 버킷 — watchType이 nullable이라 서버가 채워 보낸다
// (docs/M2C2-report-spec.md §5.1 5번). 빼면 합계가 watchCount와 맞지 않는다.
export const UNSPECIFIED_WATCH_TYPE = 'UNSPECIFIED';

export const WATCH_TYPE_REPORT_LABEL: Record<string, string> = {
  THEATER: '극장',
  OTT: 'OTT',
  ETC: '기타',
  [UNSPECIFIED_WATCH_TYPE]: '미지정',
};

export const WATCH_TYPE_REPORT_COLOR: Record<string, string> = {
  THEATER: colors.primary,
  OTT: colors.brandDeep,
  ETC: colors.star,
  [UNSPECIFIED_WATCH_TYPE]: colors.mutedForeground,
};
