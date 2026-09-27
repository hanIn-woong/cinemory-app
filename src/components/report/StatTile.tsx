import { View } from 'react-native';
import { Txt } from '../primitives/Txt';

interface StatTileProps {
  value: string;
  unit?: string;
  label: string;
}

// 큰 숫자 + 단위 + 라벨 — 요약 타일 상단 2열용(docs/M2C2-report-spec.md §4.2).
export function StatTile({ value, unit, label }: StatTileProps) {
  return (
    <View className="flex-1 items-center py-2">
      <View className="flex-row items-baseline">
        <Txt variant="h2">{value}</Txt>
        {unit && (
          <Txt variant="body" color="mutedForeground" className="ml-1">
            {unit}
          </Txt>
        )}
      </View>
      <Txt variant="caption" color="mutedForeground" className="mt-1">
        {label}
      </Txt>
    </View>
  );
}
