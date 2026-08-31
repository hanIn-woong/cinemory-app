import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../navigation/types';

// 액션 게이트 — 찜·기록·리뷰·sync처럼 화면은 보이되 특정 동작만 로그인이 필요할 때 쓴다
// (docs/M2-frontend-spec.md §6.7). 로그인 상태면 그대로 실행하고, 아니면 AuthModal을 띄운다.
// 로그인 후 원래 동작을 이어서 실행하지는 않는다 — 모달을 닫고 사용자가 다시 누르게 한다
// (대기 액션을 보관·재생하는 구조는 상태가 꼬이기 쉽고 지금 값이 크지 않다는 것이 문서의 판단).
export function useRequireAuth() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');

  return function requireAuth(action: () => void) {
    if (isAuthed) {
      action();
      return;
    }
    navigation.navigate('AuthModal', { screen: 'Login' });
  };
}
