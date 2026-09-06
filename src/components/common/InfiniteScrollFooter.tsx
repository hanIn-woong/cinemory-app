import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../theme/tokens';

interface InfiniteScrollFooterProps {
  // 더 불러올 페이지가 있는가(hasNextPage) — false면 자리 자체를 없앤다.
  visible: boolean;
  // 지금 다음 페이지를 불러오는 중인가(isFetchingNextPage).
  loading: boolean;
}

// ⚠️ `loading ? <LoadingState /> : null`처럼 풋터를 통째로 마운트/언마운트하면 페이지를
// 불러올 때마다 콘텐츠 높이가 출렁여 스크롤 중 화면이 순간적으로 튀어 보인다(실기기 확인,
// docs/DevLog.md 2026-09-05). `hasNextPage`인 동안은 항상 같은 높이를 차지하고 그 안에서
// 스피너만 켜고 꺼서, 높이가 바뀌는 순간을 리스트 끝(hasNextPage → false) 한 번으로 줄인다.
export function InfiniteScrollFooter({ visible, loading }: InfiniteScrollFooterProps) {
  if (!visible) return null;
  return (
    <View className="h-16 items-center justify-center">
      {loading && <ActivityIndicator color={colors.primary} size="small" />}
    </View>
  );
}
