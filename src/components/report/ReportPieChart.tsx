import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/tokens';
import { Txt } from '../primitives/Txt';

export interface ReportPieDatum {
  label: string;
  value: number;
  color: string;
}

interface ReportPieChartProps {
  data: ReportPieDatum[];
  radius?: number;
}

// PieChart + 커스텀 범례 — 관람 방식·월말 별점 분포에서 재사용한다
// (docs/M2C2-report-spec.md §4.1·§4.2). 라이브러리에 범례 컴포넌트가 없어 직접 그린다.
export function ReportPieChart({ data, radius = 80 }: ReportPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View className="flex-row items-center">
      <PieChart
        data={data.map((d) => ({ value: d.value, color: d.color }))}
        radius={radius}
        donut
        innerRadius={radius * 0.6}
        innerCircleColor={colors.card}
        // 조각 사이 2px 카드색 간격 — 순차 팔레트처럼 인접 색이 가까워도 경계가 보이게 한다.
        strokeWidth={2}
        strokeColor={colors.card}
      />
      <View className="ml-4 flex-1">
        {data.map((d) => (
          <View key={d.label} className="mb-2 flex-row items-center">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
            <Txt variant="caption" className="ml-2 flex-1" numberOfLines={1}>
              {d.label}
            </Txt>
            <Txt variant="caption" color="mutedForeground">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
