import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Film, Home, Map, User, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '../theme/tokens';
import { CineMapStack } from './stacks/CineMapStack';
import { HomeStack } from './stacks/HomeStack';
import { MyPageStack } from './stacks/MyPageStack';
import { RecommendStack } from './stacks/RecommendStack';
import { SocialStack } from './stacks/SocialStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        // unmountOnBlur는 켜지 않는다 — 탭 전환마다 재조회·WebView 재로딩이 일어난다.
        tabBarStyle: { height: layout.tabBarHeight + insets.bottom },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: '홈', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="RecommendTab"
        component={RecommendStack}
        options={{ title: '추천', tabBarIcon: ({ color, size }) => <Film color={color} size={size} /> }}
      />
      <Tab.Screen
        name="CineMapTab"
        component={CineMapStack}
        options={{ title: 'CineMap', tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }}
      />
      <Tab.Screen
        name="SocialTab"
        component={SocialStack}
        options={{ title: '소셜', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tab.Screen
        name="MyPageTab"
        component={MyPageStack}
        options={{ title: '마이페이지', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
