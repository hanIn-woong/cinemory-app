import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2,
  Bookmark,
  ChevronRight,
  Film,
  Heart,
  Settings as SettingsIcon,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import { AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { Divider, Screen, Spacer, Txt } from '../../components/primitives';
import { useMe } from '../../hooks/useAuth';
import { useMyRecordsCount } from '../../hooks/useRecords';
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

// (M2-C: 내 컬렉션·찜 목록·시청 분석)는 화면이 아직 자리만 있는 플레이스홀더다
// (docs/M2B-screens-spec.md §5.6 — 탭은 와이어프레임 확정 사항이라 숨기지 않는다).
const MENU_ITEMS: MenuItem[] = [
  { label: '내 기록', icon: Film, onPress: (nav) => nav.navigate('MyRecords') },
  { label: '내 컬렉션', icon: Bookmark, onPress: (nav) => nav.navigate('CollectionList') },
  { label: '찜 목록', icon: Heart, onPress: (nav) => nav.navigate('Wishlist') },
  { label: '시청 분석', icon: BarChart2, onPress: (nav) => nav.navigate('Report') },
  { label: '프로필 수정', icon: UserIcon, onPress: (nav) => nav.navigate('EditProfile') },
  { label: '설정', icon: SettingsIcon, onPress: (nav) => nav.navigate('Settings') },
];

export function MyPageScreen() {
  const navigation = useNavigation<Nav>();
  // 마이페이지는 화면 전체가 로그인 필요 — AuthRequired로 막는다(§6.7 탭별 게스트 동작).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);
  const me = useMe();
  const recordsCount = useMyRecordsCount(userId ?? 0);

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
      </View>

      <Spacer size="xl" />
      <View className="border-t border-border">
        {MENU_ITEMS.map((item) => (
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
