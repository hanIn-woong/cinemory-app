import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { colors, layout, radius } from '../../theme/tokens';
import { PosterImage } from '../movie/PosterImage';
import { Txt } from '../primitives/Txt';
import type { CalendarDayResponse, CalendarRecordItemResponse } from '../../types';

// getDay()(0=일) 순서 그대로 — 캘린더 그리드 배치 전용 헤더라 §6.2의 DAYOFWEEK 상수와는
// 다른 자리다(그 상수는 요일 분포 통계 전용).
const GRID_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 칸 치수 — compact(마이페이지 요약 위젯)와 full(캘린더 화면). full은 2026-09-28에 키웠다:
// 가로는 이미 화면 폭 7등분(~51dp)인데 세로 44·원 28·caption 숫자라 화면에 비해 작아 보였다.
// full의 높이는 고정값이 아니라 **칸 폭 × 1.5(포스터 2:3)** — 날짜 칸에 포스터를 넣을 예정이라
// 그 비율을 미리 맞춰 둔다(아래 cellHeight). 2026-10-08에 full 칸을 포스터로 채웠다(FullDayCell).
const CELL = {
  compact: { height: 32, circle: 22, dot: 4, text: 'caption' },
  full: { text: 'body' },
} as const;
const POSTER_HEIGHT_RATIO = 1 / layout.posterAspectRatio; // 2/3의 역수 = 1.5
// full 칸 안쪽 여백 — 이웃 칸과 합쳐 2dp 간격이 돼 포스터끼리 붙어 보이지 않는다(2026-10-08).
const FULL_CELL_GAP = 1;
const SELECTED_BORDER = 2;

interface CalendarViewProps {
  year: number;
  month: number; // 1-based
  days: CalendarDayResponse[];
  // 마이페이지 요약 위젯 — §9.8이 이 prop을 전제로 설계돼 있다(docs/M2C2-report-spec.md §5.4).
  compact?: boolean;
  // compact의 칸 높이를 바꿀 때 — 마이페이지가 화면 높이에 맞춰 카드를 늘리는 데 쓴다.
  compactCellHeight?: number;
  selectedDate?: string;
  onDayPress?: (day: CalendarDayResponse) => void;
}

export function CalendarView({
  year,
  month,
  days,
  compact = false,
  compactCellHeight,
  selectedDate,
  onDayPress,
}: CalendarViewProps) {
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

  const size = CELL.compact; // 아래 숫자+점 칸은 compact 전용 — full은 FullDayCell
  // 그리드 폭을 재서 칸 높이를 정한다. 첫 프레임은 화면 폭 − 화면 좌우 여백으로 추정해 크기가
  // 튀지 않게 하고, onLayout이 실측값으로 바로잡는다(CalendarScreen은 Screen의 기본 좌우 여백 안).
  const { width: windowWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(windowWidth - layout.screenPadding * 2);
  const cellHeight = compact ? (compactCellHeight ?? CELL.compact.height) : (gridWidth / 7) * POSTER_HEIGHT_RATIO;

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
          if (!compact) {
            return (
              <Pressable
                key={cell?.date ?? `blank-${i}`}
                disabled={!cell?.date || !onDayPress}
                onPress={() => cell && onDayPress?.(cell)}
                style={{ width: `${100 / 7}%`, height: cellHeight, padding: FULL_CELL_GAP }}
              >
                {dayNumber != null && (
                  <FullDayCell
                    dayNumber={dayNumber}
                    records={cell?.records ?? []}
                    width={gridWidth / 7 - FULL_CELL_GAP * 2}
                    height={cellHeight - FULL_CELL_GAP * 2}
                    isSelected={isSelected}
                  />
                )}
              </Pressable>
            );
          }
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

// full 칸 — 기록이 있으면 그날 마지막 기록의 포스터로 칸을 채우고 날짜는 좌상단 배지로 올린다.
// 선택 표시는 원형 배경 대신 칸 테두리다(포스터를 가리지 않게). 2026-10-08.
function FullDayCell({
  dayNumber,
  records,
  width,
  height,
  isSelected,
}: {
  dayNumber: number;
  records: CalendarRecordItemResponse[];
  width: number;
  height: number;
  isSelected: boolean;
}) {
  // 서버 응답은 날짜 → 기록 id 오름차순 — 마지막이 그날 가장 나중 기록이다.
  const last = records[records.length - 1];
  return (
    <View style={{ width, height }}>
      {last ? (
        <>
          {/* SHELF(w185) — 칸 폭 ~51dp × 3배 밀도 ≈ 153px. 컬렉션 선반과 같은 크기라 이미지 캐시도 공유된다.
              포스터 없는 영화는 PosterImage의 기존 그라디언트 폴백이 그대로 나온다. */}
          <PosterImage
            posterPath={last.posterPath}
            id={last.movieId ?? 0}
            width={width}
            height={height}
            size="SHELF"
            radius={radius.sm}
          />
          <View
            className="absolute left-0.5 top-0.5 rounded px-1"
            style={{ backgroundColor: colors.scrim }}
          >
            <Txt variant="caption" color="primaryForeground">
              {dayNumber}
            </Txt>
          </View>
          {records.length > 1 && (
            <View
              className="absolute bottom-0.5 right-0.5 rounded px-1"
              style={{ backgroundColor: colors.scrim }}
            >
              <Txt variant="caption" color="primaryForeground">
                +{records.length - 1}
              </Txt>
            </View>
          )}
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Txt variant={CELL.full.text} color="mutedForeground">
            {dayNumber}
          </Txt>
        </View>
      )}
      {isSelected && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderWidth: SELECTED_BORDER,
            borderColor: colors.primary,
            borderRadius: radius.sm,
          }}
        />
      )}
    </View>
  );
}
