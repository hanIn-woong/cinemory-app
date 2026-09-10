import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// 네이티브 스택 전체(Root·Auth·Home·MyPage·Social·Recommend·CineMap)에 공통으로 적용할
// screenOptions를 모아두는 자리 — 한 곳만 고치면 7개 네비게이터 전부에 반영된다.
// 뒤로가기 빈 화면 버그(docs/M2-frontend-spec.md §8.6) 조사 중 여기서 animationDuration
// 단축을 실험했으나 부족했고, 실제 해결은 옵션이 아니라 ../backGuard.ts의
// screenListeners로 났다 — 그래서 지금은 빈 값. 실험 경위는 §8.6 참고.
export const DEFAULT_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {};
