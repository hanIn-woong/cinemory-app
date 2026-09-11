import './src/utils/perf'; // §7.5 계측 — APP_T0를 가장 먼저 평가시킨다(맨 위 import 유지할 것)
import './global.css';
import { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLoadingScreen } from './src/components/common';
import { useHomeBackgroundReady } from './src/hooks/useHomeBackgroundReady';
import { queryClient } from './src/api/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';

// 모듈 최상단에서 즉시 — 컴포넌트 안에서 호출하면 로그인 화면이 한 번 번쩍인다.
SplashScreen.preventAutoHideAsync();

// §7.5(2026-09-12) — 홈 배경 포스터 프리페치가 끝날 때까지 `AppLoadingScreen`을 보여주고,
// 그동안은 `NavigationContainer`를 아예 마운트하지 않는다. 네이티브 스플래시는 여기 진입하는
// 즉시(= 이 화면이 레이아웃을 마치는 즉시) 내린다 — 프리페치 대기를 정지된 네이티브 스플래시가
// 아니라 스피너가 도는 이 화면에서 보이게 하기 위해서다(팝인이 화면에 노출되지 않는다).
function AppContent() {
  const backgroundReady = useHomeBackgroundReady();
  const splashHiddenRef = useRef(false);

  const hideSplashOnce = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    SplashScreen.hideAsync();
  }, []);

  if (!backgroundReady) {
    return <AppLoadingScreen onLayout={hideSplashOnce} />;
  }

  return (
    <NavigationContainer onReady={hideSplashOnce}>
      <RootNavigator />
    </NavigationContainer>
  );
}

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

  if (status === 'loading') return null; // 스플래시가 아직 떠 있다

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppContent />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
