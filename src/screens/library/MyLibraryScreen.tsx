import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { type RouteProp, useRoute } from '@react-navigation/native';
import { AuthRequired } from '../../components/common';
import type { LibraryTabParamList, MyPageStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';
import { RecordsTab } from './RecordsTab';
import { WishesTab } from './WishesTab';

type Rt = RouteProp<MyPageStackParamList, 'MyLibrary'>;

const Tab = createMaterialTopTabNavigator<LibraryTabParamList>();

// 내 기록 + 찜 목록을 스와이프 탭 하나로 묶는다(docs/library-sort-spec.md §3).
// ⚠️ 탭 바는 접지 않는다 — 각 탭 안의 정렬/보기 툴바만 접힌다. 탭 바까지 접히면 탭 전환
// 수단이 사라진다(§3.4). 탭 바는 씬 바깥에 있으므로 구조상 접히지 않는다.
export function MyLibraryScreen() {
  const route = useRoute<Rt>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);

  if (!isAuthed || userId == null) {
    return <AuthRequired description="내 영화 화면은 로그인 후 볼 수 있어요" />;
  }

  return (
    <Tab.Navigator
      initialRouteName={route.params?.initialTab ?? 'records'}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIndicatorStyle: { backgroundColor: colors.primary },
        tabBarStyle: { backgroundColor: colors.background },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen name="records" options={{ title: '시청 목록' }}>
        {() => <RecordsTab userId={userId} />}
      </Tab.Screen>
      <Tab.Screen name="wishes" options={{ title: '찜 목록' }}>
        {() => <WishesTab userId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
