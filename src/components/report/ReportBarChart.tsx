import { useState } from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/tokens';

interface ReportBarChartProps {
  data: { value: number; label: string; frontColor?: string }[];
  height?: number;
  barWidth?: number;
  spacing?: number;
  // 월별 추이처럼 항목이 많아 가로 스크롤이 필요할 때만 켠다(docs/M2C2-report-spec.md §5.1 4번).
  scrollable?: boolean;
  maxValue?: number;
  yAxisLabelSuffix?: string;
}

// gifted-charts 기본 y축 라벨 폭(AxesAndRulesDefaults.yAxisLabelWidth).
const Y_AXIS_LABEL_WIDTH = 35;
// 폭에 맞춰 줄일 때 한 칸(막대+간격) 중 막대가 차지하는 비율.
const FIT_BAR_RATIO = 0.6;

// BarChart 공통 스타일 래퍼 — 별점 분포·월별 추이·요일·연대에서 재사용한다
// (docs/M2C2-report-spec.md §4.1·§4.2).
// 스크롤을 끈 차트는 카드 폭을 재서 모든 막대가 들어가도록 막대 폭·간격을 줄인다 —
// 고정값(24+16)이면 별점 10버킷이 카드보다 넓어 4.5·5.0 막대가 잘렸다.
export function ReportBarChart({
  data,
  height = 180,
  barWidth = 24,
  spacing = 16,
  scrollable = false,
  maxValue,
  yAxisLabelSuffix,
}: ReportBarChartProps) {
  const [parentWidth, setParentWidth] = useState(0);
  const chartWidth = Math.max(parentWidth - Y_AXIS_LABEL_WIDTH, 0);

  let fittedBarWidth = barWidth;
  let fittedSpacing = spacing;
  let edgeSpacing = spacing;
  if (!scrollable && chartWidth > 0 && data.length > 0) {
    // initial·end 간격을 spacing/2로 두면 전체 폭 = 칸 폭 × 막대 수.
    const slot = chartWidth / data.length;
    if (slot < barWidth + spacing) {
      fittedBarWidth = Math.min(barWidth, slot * FIT_BAR_RATIO);
      fittedSpacing = slot - fittedBarWidth;
    }
    edgeSpacing = fittedSpacing / 2;
  }

  return (
    <View onLayout={(e) => setParentWidth(e.nativeEvent.layout.width)}>
      {parentWidth > 0 && (
        <BarChart
          data={data.map((d) => ({ frontColor: colors.primary, ...d }))}
          width={chartWidth}
          height={height}
          barWidth={fittedBarWidth}
          spacing={fittedSpacing}
          initialSpacing={edgeSpacing}
          endSpacing={scrollable ? spacing : edgeSpacing}
          maxValue={maxValue}
          yAxisLabelSuffix={yAxisLabelSuffix}
          yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
          roundedTop
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.border}
          rulesColor={colors.muted}
          yAxisTextStyle={{ color: colors.mutedForeground, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: colors.mutedForeground, fontSize: 11 }}
          noOfSections={4}
          disableScroll={!scrollable}
          isAnimated
        />
      )}
    </View>
  );
}
