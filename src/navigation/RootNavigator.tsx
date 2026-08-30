import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

// 화면에서 수동으로 navigate('Main')을 호출하지 않는다. 로그인 성공 시
// authStore.setTokens() + setUser()만 부르면 이 분기가 알아서 바뀐다
// (docs/M2A-foundation-spec.md §8.2).
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  return status === 'authenticated' ? <MainTabNavigator /> : <AuthNavigator />;
}
