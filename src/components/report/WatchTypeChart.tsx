import { UNSPECIFIED_WATCH_TYPE, WATCH_TYPE_REPORT_COLOR, WATCH_TYPE_REPORT_LABEL } from '../../constants/watchType';
import { colors } from '../../theme/tokens';
import { Txt } from '../primitives/Txt';
import { ReportPieChart } from './ReportPieChart';

interface WatchTypeChartProps {
  distribution?: { watchType?: string; count?: number }[];
}

// 관람 방식 분포 PieChart — 누적·월간·연간 공용(docs/M2C2-report-spec.md §5.1 5번).
// ⚠️ 미지정(UNSPECIFIED)이 과반이면 차트 대신 입력 유도 문구 — 미지정이 대부분인 파이는 정보가 없다.
export function WatchTypeChart({ distribution }: WatchTypeChartProps) {
  const watchTypes = distribution ?? [];
  const total = watchTypes.reduce((sum, w) => sum + (w.count ?? 0), 0);
  const unspecified = watchTypes.find((w) => w.watchType === UNSPECIFIED_WATCH_TYPE)?.count ?? 0;

  if (total > 0 && unspecified / total > 0.5) {
    return (
      <Txt variant="caption" color="mutedForeground">
        관람 방식을 기록하면 분포를 볼 수 있어요
      </Txt>
    );
  }
  if (watchTypes.length === 0) return null;

  return (
    <ReportPieChart
      data={watchTypes.map((w) => ({
        label: WATCH_TYPE_REPORT_LABEL[w.watchType ?? ''] ?? w.watchType ?? '',
        value: w.count ?? 0,
        color: WATCH_TYPE_REPORT_COLOR[w.watchType ?? ''] ?? colors.mutedForeground,
      }))}
    />
  );
}
