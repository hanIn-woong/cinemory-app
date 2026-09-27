import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { MovieListItem } from '../../components/movie/MovieListItem';
import { Button, Screen, Spacer, Txt } from '../../components/primitives';
import { CalendarView } from '../../components/report';
import { useCalendar } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'Calendar'>;

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  const calendar = useCalendar(userId, year, month);

  if (!isAuthed) {
    return <AuthRequired description="캘린더는 로그인 후 볼 수 있어요" />;
  }

  // ⚠️ 다음 달로 넘어가도 400이 아니다 — 서버가 미래 월을 빈 결과 200으로 준다(RA-2).
  // 이동을 막지 않는다.
  function goToMonth(delta: number) {
    setSelectedDate(undefined);
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const days = calendar.data?.days ?? [];
  const selectedDay = days.find((d) => d.date === selectedDate);

  return (
    <Screen scroll edges={['left', 'right']}>
      <Spacer size="md" />
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => goToMonth(-1)} hitSlop={8}>
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
        <Txt variant="h3">
          {year}년 {month}월
        </Txt>
        <Pressable onPress={() => goToMonth(1)} hitSlop={8}>
          <ChevronRight size={22} color={colors.foreground} />
        </Pressable>
      </View>
      <Spacer size="sm" />
      <Button variant="secondary" onPress={() => navigation.navigate('MonthlyReport', { year, month })}>
        이달의 리포트
      </Button>
      <Spacer size="md" />

      {calendar.isLoading ? (
        <LoadingState variant="detail" />
      ) : calendar.isError ? (
        <ErrorState message={calendar.error?.message} onRetry={() => calendar.refetch()} />
      ) : (
        <>
          <CalendarView
            year={year}
            month={month}
            days={days}
            selectedDate={selectedDate}
            onDayPress={(day) => setSelectedDate(day.date === selectedDate ? undefined : day.date)}
          />
          <Spacer size="md" />
          {selectedDay && (
            <View>
              <Txt variant="h4">{selectedDay.date}</Txt>
              <Spacer size="sm" />
              {selectedDay.records && selectedDay.records.length > 0 ? (
                selectedDay.records.map((record) => (
                  <MovieListItem
                    key={record.recordId}
                    id={record.movieId ?? 0}
                    title={record.title ?? ''}
                    posterPath={record.posterPath}
                    subtitle={record.rating != null ? `내 별점 ${(record.rating / 2).toFixed(1)}` : undefined}
                    onPress={() => navigation.navigate('MovieDetail', { movieId: record.movieId ?? 0 })}
                  />
                ))
              ) : (
                <Txt variant="caption" color="mutedForeground">
                  이날은 기록이 없어요
                </Txt>
              )}
            </View>
          )}
        </>
      )}
      <Spacer size="xl" />
    </Screen>
  );
}
