import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2,
  Bookmark,
  ChevronRight,
  Film,
  Pencil,
  Settings as SettingsIcon,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { Card, Divider, Screen, Spacer, Txt } from '../../components/primitives';
import { CalendarView } from '../../components/report';
import { useMe } from '../../hooks/useAuth';
import { useMyRecordsCount } from '../../hooks/useRecords';
import { useCalendar } from '../../hooks/useReport';
import type { MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<MyPageStackParamList, 'MyPage'>;

const COVER_HEIGHT = 128;
const AVATAR_SIZE = 96;

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onPress: (navigation: Nav) => void;
}

// 찜 목록은 별도 메뉴가 아니라 "내 영화"(MyLibrary) 화면 안의 탭에서 진입한다(library-sort-spec §3.3).
const GRID_ITEMS: MenuItem[] = [
  { label: '내 영화', icon: Film, onPress: (nav) => nav.navigate('MyLibrary') },
  { label: '내 컬렉션', icon: Bookmark, onPress: (nav) => nav.navigate('CollectionList') },
];

const LIST_ITEMS: MenuItem[] = [
  { label: '시청 분석 리포트', icon: BarChart2, onPress: (nav) => nav.navigate('Report') },
  { label: '설정', icon: SettingsIcon, onPress: (nav) => nav.navigate('Settings') },
];

export function MyPageScreen() {
  const navigation = useNavigation<Nav>();
  // 마이페이지는 화면 전체가 로그인 필요 — AuthRequired로 막는다(§6.7 탭별 게스트 동작).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const me = useMe();
  const recordsCount = useMyRecordsCount(userId ?? 0);
  const today = new Date();
  // 쿼리 키가 Calendar 상세와 같다(['report','calendar',userId,year,month]) — 탭해서
  // 진입해도 재요청이 없다(docs/M2C2-report-spec.md §5.4).
  const calendar = useCalendar(userId, today.getFullYear(), today.getMonth() + 1);

  if (!isAuthed) {
    return <AuthRequired description="마이페이지는 로그인 후 이용할 수 있어요" />;
  }

  if (me.isLoading) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={me.error?.message} onRetry={() => me.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['left', 'right']}>
      <LinearGradient
        colors={[colors.primary, colors.brandDeep]}
        style={{ height: COVER_HEIGHT }}
      />
      <View className="items-center px-4" style={{ marginTop: -AVATAR_SIZE / 2 }}>
        <ProfileAvatar uri={me.data.profileImage} />
        <Spacer size="sm" />
        <Txt variant="h3">{me.data.nickname}</Txt>
        <Spacer size="xs" />
        <Txt variant="caption" color="mutedForeground">
          {recordsCount.isSuccess ? `영화 ${recordsCount.data}편 관람` : ' '}
        </Txt>
        <Spacer size="sm" />
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

      <Spacer size="xl" />
      <View className="flex-row px-4" style={{ gap: 12 }}>
        {GRID_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => item.onPress(navigation)}
            className="flex-1 items-center justify-center rounded-lg border border-border bg-card py-5"
          >
            <item.icon size={22} color={colors.foreground} />
            <Spacer size="xs" />
            <Txt variant="body">{item.label}</Txt>
          </Pressable>
        ))}
      </View>

      <Spacer size="lg" />
      <View className="px-4">
        <Pressable onPress={() => navigation.navigate('Calendar')}>
          <Card>
            <View className="flex-row items-center justify-between">
              <Txt variant="h4">
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
              />
            )}
          </Card>
        </Pressable>
      </View>

      <Spacer size="lg" />
      <View className="border-t border-border">
        {LIST_ITEMS.map((item) => (
          <View key={item.label}>
            <Pressable
              className="flex-row items-center px-4 py-4"
              onPress={() => item.onPress(navigation)}
            >
              <item.icon size={20} color={colors.mutedForeground} />
              <Txt variant="body" className="ml-3 flex-1">
                {item.label}
              </Txt>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>
            <Divider />
          </View>
        ))}
      </View>
    </Screen>
  );
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
