import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { colors, layout } from '../../theme/tokens';
import { Txt } from '../primitives/Txt';
import type { CalendarDayResponse } from '../../types';

// getDay()(0=일) 순서 그대로 — 캘린더 그리드 배치 전용 헤더라 §6.2의 DAYOFWEEK 상수와는
// 다른 자리다(그 상수는 요일 분포 통계 전용).
const GRID_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 칸 치수 — compact(마이페이지 요약 위젯)와 full(캘린더 화면). full은 2026-09-28에 키웠다:
// 가로는 이미 화면 폭 7등분(~51dp)인데 세로 44·원 28·caption 숫자라 화면에 비해 작아 보였다.
// full의 높이는 고정값이 아니라 **칸 폭 × 1.5(포스터 2:3)** — 날짜 칸에 포스터를 넣을 예정이라
// 그 비율을 미리 맞춰 둔다(아래 fullCellHeight).
const CELL = {
  compact: { height: 32, circle: 22, dot: 4, text: 'caption' },
  full: { circle: 38, dot: 5, text: 'body' },
} as const;
const POSTER_HEIGHT_RATIO = 1 / layout.posterAspectRatio; // 2/3의 역수 = 1.5

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

  const size = compact ? CELL.compact : CELL.full;
  // 그리드 폭을 재서 칸 높이를 정한다. 첫 프레임은 화면 폭 − 화면 좌우 여백으로 추정해 크기가
  // 튀지 않게 하고, onLayout이 실측값으로 바로잡는다(CalendarScreen은 Screen의 기본 좌우 여백 안).
  const { width: windowWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(windowWidth - layout.screenPadding * 2);
  const cellHeight = compact ? CELL.compact.height : (gridWidth / 7) * POSTER_HEIGHT_RATIO;

  return (
    <View>
      <View className="flex-row">
        {GRID_WEEKDAY_LABELS.map((label) => (
          <View key={label} className={compact ? 'flex-1 items-center py-1' : 'flex-1 items-center py-2'}>
            <Txt variant="caption" color="mutedForeground">
              {label}
            </Txt>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap" onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
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
              style={{ width: `${100 / 7}%`, height: cellHeight }}
            >
              {dayNumber != null && (
                <>
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      width: size.circle,
                      height: size.circle,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    }}
                  >
                    <Txt
                      variant={size.text}
                      color={isSelected ? 'primaryForeground' : recordCount > 0 ? 'foreground' : 'mutedForeground'}
                    >
                      {dayNumber}
                    </Txt>
                  </View>
                  {recordCount > 0 && (
                    <View
                      className="mt-0.5 rounded-full"
                      style={{ width: size.dot, height: size.dot, backgroundColor: isSelected ? colors.primaryForeground : colors.primary }}
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
