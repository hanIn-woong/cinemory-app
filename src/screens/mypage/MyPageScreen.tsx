import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2,
  ChevronRight,
  Film,
  LibraryBig,
  Pencil,
  Settings as SettingsIcon,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { Card, Divider, Screen, Spacer, Txt } from '../../components/primitives';
import { CalendarView, ReportLinkCard } from '../../components/report';
import { useMe } from '../../hooks/useAuth';
import { useMyRecordsCount } from '../../hooks/useRecords';
import { useCalendar } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, layout } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'MyPage'>;

const COVER_HEIGHT = 128;
const AVATAR_SIZE = 96;
const AVATAR_RING = 2;

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onPress: (navigation: Nav) => void;
}

// 찜 목록은 별도 메뉴가 아니라 "내 영화"(MyLibrary) 화면 안의 탭에서 진입한다(library-sort-spec §3.3).
const GRID_ITEMS: MenuItem[] = [
  { label: '내 영화', icon: Film, onPress: (nav) => nav.navigate('MyLibrary') },
  { label: '내 컬렉션', icon: LibraryBig, onPress: (nav) => nav.navigate('CollectionList') },
];

export function MyPageScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  // 마이페이지는 화면 전체가 로그인 필요 — AuthRequired로 막는다(§6.7 탭별 게스트 동작).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const me = useMe();
  const recordsCount = useMyRecordsCount(userId ?? 0);
  const today = new Date();
  // 쿼리 키가 Calendar 상세와 같다(['report','calendar',userId,year,month]) — 탭해서
  // 진입해도 재요청이 없다(docs/M2C2-report-spec.md §5.4).
  const calendar = useCalendar(userId, today.getFullYear(), today.getMonth() + 1);
  const calendarFit = useCalendarFit(today.getFullYear(), today.getMonth() + 1, calendar.data != null);

  if (!isAuthed) {
    return <AuthRequired description="마이페이지는 로그인 후 이용할 수 있어요" />;
  }

  if (me.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen>
        <ErrorState message={me.error?.message} onRetry={() => me.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['left', 'right']}>
      {/* 헤더가 없어 커버가 상태바 밑까지 올라간다 — 상태바 높이만큼 커버를 늘려 보이는 커버 높이를
          유지하고, 톱니바퀴도 그만큼 내려 노치·상태바에 가리지 않게 한다. */}
      <View style={{ height: COVER_HEIGHT + insets.top }}>
        <LinearGradient colors={[colors.primary, colors.brandDeep]} style={{ flex: 1 }} />
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          hitSlop={8}
          className="absolute right-4 h-9 w-9 items-center justify-center rounded-full bg-black/15"
          style={{ top: insets.top + 12 }}
        >
          <SettingsIcon size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
      <View className="items-center px-4" style={{ marginTop: -(AVATAR_SIZE + AVATAR_RING * 2) / 2 }}>
        {/* 흰 border-4(커버 컷아웃) 바깥에 브랜드 링을 한 겹 더 두른다. */}
        <View className="rounded-full" style={{ borderWidth: AVATAR_RING, borderColor: colors.primary }}>
          <ProfileAvatar uri={me.data.profileImage} />
        </View>
        <Spacer size="sm" />
        <Txt variant="h3">{me.data.nickname}</Txt>
        <Spacer size="xs" />
        <View className="h-0.5 w-8 rounded-full bg-primary" />
        <Spacer size="sm" />
        {/* 로딩 중에도 자리를 지켜 아래 요소가 튀지 않게 투명 처리만 한다. */}
        <View
          className="flex-row items-center rounded-full px-3 py-1"
          style={{ backgroundColor: colors.brandLight, opacity: recordsCount.isSuccess ? 1 : 0 }}
        >
          <Film size={12} color={colors.brandDeep} />
          <Txt variant="caption" className="ml-1 font-semibold" style={{ color: colors.brandDeep }}>
            영화 {recordsCount.data ?? 0}편 관람
          </Txt>
        </View>
        <Spacer size="md" />
        <Pressable
          onPress={() => navigation.navigate('EditProfile')}
          className="flex-row items-center rounded-full border border-border px-4 py-1.5"
        >
          <Pencil size={14} color={colors.mutedForeground} />
          <Txt variant="caption" className="ml-1.5">
            프로필 수정
          </Txt>
        </Pressable>
      </View>

      <Spacer size="lg" />
      <View className="px-4">
        <Divider />
      </View>
      <Spacer size="lg" />
      <View className="flex-row px-4" style={{ gap: 12 }}>
        {GRID_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => item.onPress(navigation)}
            className="flex-1 items-center justify-center rounded-lg border border-primary bg-card py-5"
          >
            <item.icon size={22} color={colors.primary} />
            <Spacer size="xs" />
            <Txt variant="body" color="primary">
              {item.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Spacer size="lg" />
      <View className="px-4" onLayout={calendarFit.onLayout}>
        <Pressable onPress={() => navigation.navigate('Calendar')}>
          {/* Card의 border-border를 className으로 덮으면 우선순위가 보장되지 않아 style로 준다. */}
          <Card style={{ borderColor: colors.primary }}>
            {/* 제목을 가운데 둔다 — 왼쪽에 쉐브런과 같은 너비의 빈 칸을 둬서 오른쪽
                쉐브런과 무게를 맞춘다. 안 그러면 제목이 왼쪽으로 치우쳐서 아래 7칸
                요일 그리드(가운데 정렬)와 어긋나 보인다. */}
            <View className="flex-row items-center justify-between">
              <View style={{ width: 18 }} />
              <Txt variant="h4" className="flex-1 text-center">
                {today.getMonth() + 1}월 캘린더
              </Txt>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </View>
            <Spacer size="sm" />
            {calendar.data && (
              <CalendarView
                year={today.getFullYear()}
                month={today.getMonth() + 1}
                days={calendar.data.days ?? []}
                compact
                compactCellHeight={calendarFit.cellHeight}
              />
            )}
          </Card>
        </Pressable>
      </View>

      <Spacer size="lg" />
      <View className="px-4">
        <ReportLinkCard
          icon={BarChart2}
          title="시청 분석 리포트"
          description="지금까지의 시청 기록으로 나의 취향을 확인해보세요"
          onPress={() => navigation.navigate('Report')}
        />
      </View>

      <Spacer size="xl" />
    </Screen>
  );
}

const CALENDAR_CELL_MIN = 32; // CalendarView compact 기본값
const CALENDAR_CELL_MAX = 72;
// 카드 아래 끝을 보이는 영역 끝보다 이만큼 위에 둔다 — 그 아래 Spacer(lg 16)가 있어서 리포트
// 박스 윗변은 화면 밖 12px에서 시작한다.
const CALENDAR_BOTTOM_INSET = 4;

// 캘린더 위젯을 화면 아래 끝까지 늘린다 — 시청 분석 리포트 박스는 스크롤해야 보이게(사용자 요청,
// 2026-10-02). 고정 숫자로 키우면 기기마다 리포트가 보였다 안 보였다 해서 화면 높이로 계산한다.
// 카드 위치와 높이를 실측하고(onLayout), 칸 높이를 뺀 나머지(제목·요일줄·패딩)는 그대로 둔 채
// 칸 높이만 조정한다 — 칸 높이를 바꿔도 나머지는 변하지 않아 한 번에 맞는다.
function useCalendarFit(year: number, month: number, hasGrid: boolean) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cellHeight, setCellHeight] = useState(CALENDAR_CELL_MIN);
  // 헤더가 없어 스크롤 영역은 창 맨 위에서 시작하고 탭바 위에서 끝난다(MainTabNavigator의 tabBarStyle).
  const viewportHeight = windowHeight - (layout.tabBarHeight + insets.bottom);
  const rows = Math.ceil((new Date(year, month - 1, 1).getDay() + new Date(year, month, 0).getDate()) / 7);

  const onLayout = (e: LayoutChangeEvent) => {
    if (!hasGrid) return; // 그리드가 그려지기 전 높이는 칸 높이 계산에 쓸 수 없다
    const { y, height } = e.nativeEvent.layout;
    const chrome = height - rows * cellHeight;
    const target = (viewportHeight - CALENDAR_BOTTOM_INSET - y - chrome) / rows;
    const next = Math.min(CALENDAR_CELL_MAX, Math.max(CALENDAR_CELL_MIN, target));
    if (Math.abs(next - cellHeight) > 1) setCellHeight(next);
  };

  return { cellHeight, onLayout };
}

function ProfileAvatar({ uri }: { uri?: string | null }) {
  if (!uri) {
    return (
      <View
        className="items-center justify-center rounded-full border-4 border-background bg-muted"
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      >
        <UserIcon size={36} color={colors.mutedForeground} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      className="rounded-full border-4 border-background"
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
    />
  );
}
