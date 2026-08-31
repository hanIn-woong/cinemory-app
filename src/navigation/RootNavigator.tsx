import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 게스트 우선(docs/M2-frontend-spec.md §6.7) — Main은 항상 뜨고, 인증은 필요한 순간에만
// AuthModal로 push된다. status로 전체 트리를 갈아끼우던 구조는 폐기됐다.
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="AuthModal" component={AuthNavigator} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
