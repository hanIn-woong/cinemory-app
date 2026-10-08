import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, PieChart } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { MovieListItem } from '../../components/movie/MovieListItem';
import { Screen, Spacer, Txt } from '../../components/primitives';
import { CalendarView, ReportLinkCard } from '../../components/report';
import { useCalendar, useCalendarNeighborPrefetch } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'Calendar'>;

// 가로 활성화는 빨리(12px), 세로 포기 기준은 그대로(20px) — 세로 스크롤을 뺏지 않는 선에서 반응을 앞당긴다.
const SWIPE_ACTIVATE_PX = 12;
const SWIPE_VERTICAL_FAIL_PX = 20;
const SWIPE_COMMIT_PX = 40;
const SWIPE_FLING_VELOCITY = 300; // px/s — 짧게 튕겨도 넘어가게
// 나가기 + 들어오기 두 번이라 체감 전환 시간은 이 값의 2배다.
const SLIDE_MS = 140;

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const today = new Date();
  const [{ year, month }, setYearMonth] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const { width } = useWindowDimensions();

  const calendar = useCalendar(userId, year, month);
  // 들어오는 슬라이드가 끝났는가 — 미리 받기를 그 뒤로 미룬다(아래 이펙트가 끝에 true로 바꾼다).
  const [slideSettled, setSlideSettled] = useState(true);
  // 지금 달이 뜨고 슬라이드가 끝난 뒤에 앞뒤 달을 미리 받는다 — 지금 달 포스터보다 먼저 줄 서지 않고,
  // 받은 달로 넘기는 순간(데이터가 이미 있어 바로 그려진다) 이웃 다운로드가 애니메이션과 겹치지 않게
  // (2026-10-08 실기기 — 겹치면 스와이프가 나빠졌다).
  useCalendarNeighborPrefetch(userId, year, month, calendar.isSuccess && slideSettled);

  // ⚠️ 다음 달로 넘어가도 400이 아니다 — 서버가 미래 월을 빈 결과 200으로 준다(RA-2).
  // 이동을 막지 않는다. 함수형 업데이트라 제스처 콜백이 옛 렌더의 값을 잡고 있어도 안전하다.
  const enterFrom = useRef<number | null>(null);
  const shiftMonth = useCallback((delta: number) => {
    setSelectedDate(undefined);
    setSlideSettled(false);
    setYearMonth((prev) => {
      const next = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() + 1 };
    });
    enterFrom.current = delta;
  }, []);

  // 미끄러짐: 밀어낸 방향으로 화면 밖까지 나간 뒤 달을 바꾸고, 새 달은 반대편에서 들어온다.
  // ⚠️ 들어오는 애니메이션은 새 달이 **그려진 뒤**(이펙트) 시작한다 — 달 변경 직후 바로 시작하면
  // 렌더가 반영되기 전 몇 프레임 동안 옛 달이 다시 들어오는 게 보일 수 있다.
  const slideX = useSharedValue(0);
  useEffect(() => {
    const delta = enterFrom.current;
    if (delta === null) return;
    enterFrom.current = null;
    slideX.value = delta * width;
    slideX.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      // 도중에 다시 넘기면 finished = false — 그 다음 슬라이드가 끝날 때 켜진다.
      if (finished) scheduleOnRN(setSlideSettled, true);
    });
  }, [year, month, width, slideX]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }));

  if (!isAuthed) {
    return <AuthRequired description="캘린더는 로그인 후 볼 수 있어요" />;
  }

  function slideTo(delta: number) {
    slideX.value = withTiming(-delta * width, { duration: SLIDE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(shiftMonth, delta);
    });
  }

  const days = calendar.data?.days ?? [];
  const selectedDay = days.find((d) => d.date === selectedDate);

  // 좌우로 밀어 달 이동 — 왼쪽으로 밀면 다음 달. 손가락을 따라 움직이다가, 충분히 밀었거나 빠르게
  // 튕기면 넘기고 아니면 제자리로 돌아온다. 세로 스크롤(Screen scroll)과 날짜 탭을 뺏지 않게
  // 가로로 충분히 움직였을 때만 활성화하고, 세로가 먼저 움직이면 포기한다.
  const swipe = Gesture.Pan()
    .activeOffsetX([-SWIPE_ACTIVATE_PX, SWIPE_ACTIVATE_PX])
    .failOffsetY([-SWIPE_VERTICAL_FAIL_PX, SWIPE_VERTICAL_FAIL_PX])
    .onUpdate((e) => {
      slideX.value = e.translationX;
    })
    .onEnd((e) => {
      const toNext = e.translationX <= -SWIPE_COMMIT_PX || e.velocityX <= -SWIPE_FLING_VELOCITY;
      const toPrev = e.translationX >= SWIPE_COMMIT_PX || e.velocityX >= SWIPE_FLING_VELOCITY;
      const delta = toNext ? 1 : toPrev ? -1 : 0;
      if (delta === 0) {
        slideX.value = withTiming(0, { duration: SLIDE_MS });
        return;
      }
      slideX.value = withTiming(-delta * width, { duration: SLIDE_MS }, (finished) => {
        if (finished) scheduleOnRN(shiftMonth, delta);
      });
    });

  return (
    <Screen scroll edges={['left', 'right']}>
      <Spacer size="md" />
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => slideTo(-1)} hitSlop={8}>
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
        <Txt variant="h3">
          {year}년 {month}월
        </Txt>
        <Pressable onPress={() => slideTo(1)} hitSlop={8}>
          <ChevronRight size={22} color={colors.foreground} />
        </Pressable>
      </View>
      <Spacer size="lg" />
      <ReportLinkCard
        compact
        icon={PieChart}
        title="이달의 리포트"
        description={`${year}년 ${month}월의 시청 기록을 한눈에 정리해 드려요`}
        onPress={() => navigation.navigate('PeriodReport', { year, month })}
      />
      <Spacer size="lg" />

      <GestureDetector gesture={swipe}>
        <Animated.View style={slideStyle}>
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
        </Animated.View>
      </GestureDetector>
      <Spacer size="xl" />
    </Screen>
  );
}
