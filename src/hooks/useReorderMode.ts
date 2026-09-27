import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

// 순서 편집 모드의 공통 상태 — 컬렉션 목록·컬렉션 상세가 같이 쓴다(docs/collection-order-spec.md §3.2).
// 일반 모드(무한스크롤)와 편집 모드(전량 로드 + 드래그)를 분리하는 것이 설계의 뼈대라, 편집 중
// 배열은 서버 캐시가 아니라 이 훅의 로컬 상태로만 들고 있다가 저장 때 한 번에 보낸다.
export function useReorderMode<T>(keyOf: (item: T) => string) {
  const navigation = useNavigation();
  const [editing, setEditing] = useState(false);
  const [original, setOriginal] = useState<T[]>([]);
  const [order, setOrder] = useState<T[]>([]);

  const dirty =
    editing && (original.length !== order.length || original.some((item, i) => keyOf(item) !== keyOf(order[i])));

  // ⚠️ 저장하지 않은 변경이 있을 때만 막는다 — 변경이 없으면 뒤로가기는 그냥 나간다.
  // usePreventRemove는 beforeRemove를 native-stack에 맞게 감싼 공식 훅이다. §8.6에서 걷어낸
  // beforeRemove 가드는 네이티브가 이미 하는 일을 JS로 재구현한 잘못된 용도였고, 이것은
  // "떠나기 전에 묻는다"는 이 API의 본래 용도라 모순이 아니다(§3.2 💡).
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('저장하지 않은 변경이 있어요', '순서를 저장하지 않고 나가면 변경이 사라집니다', [
      { text: '계속 편집', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const start = useCallback((items: T[]) => {
    setOriginal(items);
    setOrder(items);
    setEditing(true);
  }, []);

  // 취소·저장 실패 모두 편집을 닫는다 — 화면은 무한스크롤 캐시(= 서버 순서 또는 롤백된 낙관적
  // 캐시)로 돌아가므로 "원래 순서로 복원"이 된다.
  const finish = useCallback(() => {
    setEditing(false);
    setOriginal([]);
    setOrder([]);
  }, []);

  return { editing, order, setOrder, dirty, start, finish };
}
