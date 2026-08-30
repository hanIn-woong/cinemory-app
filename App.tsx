import './global.css';
import { useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/api/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';

// 모듈 최상단에서 즉시 — 컴포넌트 안에서 호출하면 로그인 화면이 한 번 번쩍인다.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    // restore() 내부가 자체 try/catch로 절대 던지지 않지만 (§5 규칙 5), 이중 안전망으로 둔다.
    // 여기서 상태를 바꾸지 않으면 status가 'loading'에 갇혀 스플래시가 풀리지 않는다.
    useAuthStore
      .getState()
      .restore()
      .catch(() => useAuthStore.setState({ status: 'anonymous' }));
  }, []);

  const onReady = useCallback(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'loading') return null; // 스플래시가 아직 떠 있다

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer onReady={onReady}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
