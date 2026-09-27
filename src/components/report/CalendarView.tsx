import { Pressable, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { Txt } from '../primitives/Txt';
import type { CalendarDayResponse } from '../../types';

// getDay()(0=일) 순서 그대로 — 캘린더 그리드 배치 전용 헤더라 §6.2의 DAYOFWEEK 상수와는
// 다른 자리다(그 상수는 요일 분포 통계 전용).
const GRID_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarViewProps {
  year: number;
  month: number; // 1-based
  days: CalendarDayResponse[];
  // 마이페이지 요약 위젯 — §9.8이 이 prop을 전제로 설계돼 있다(docs/M2C2-report-spec.md §5.4).
  compact?: boolean;
  selectedDate?: string;
  onDayPress?: (day: CalendarDayResponse) => void;
}

export function CalendarView({ year, month, days, compact = false, selectedDate, onDayPress }: CalendarViewProps) {
  const byDate = new Map(days.map((d) => [d.date!, d]));
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const cells: (CalendarDayResponse | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return byDate.get(dateStr) ?? { date: dateStr, records: [] };
    }),
  ];

  return (
    <View>
      <View className="flex-row">
        {GRID_WEEKDAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center py-1">
            <Txt variant="caption" color="mutedForeground">
              {label}
            </Txt>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((cell, i) => {
          const dayNumber = cell?.date ? Number(cell.date.slice(-2)) : null;
          const recordCount = cell?.records?.length ?? 0;
          const isSelected = cell?.date != null && cell.date === selectedDate;
          return (
            <Pressable
              key={cell?.date ?? `blank-${i}`}
              disabled={!cell?.date || !onDayPress}
              onPress={() => cell && onDayPress?.(cell)}
              className="items-center justify-center"
              style={{ width: `${100 / 7}%`, height: compact ? 32 : 44 }}
            >
              {dayNumber != null && (
                <>
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      width: compact ? 22 : 28,
                      height: compact ? 22 : 28,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    }}
                  >
                    <Txt
                      variant="caption"
                      color={isSelected ? 'primaryForeground' : recordCount > 0 ? 'foreground' : 'mutedForeground'}
                    >
                      {dayNumber}
                    </Txt>
                  </View>
                  {recordCount > 0 && (
                    <View
                      className="mt-0.5 rounded-full"
                      style={{ width: 4, height: 4, backgroundColor: isSelected ? colors.primaryForeground : colors.primary }}
                    />
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
