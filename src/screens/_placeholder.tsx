import { EmptyState } from '../components/common';
import { Screen } from '../components/primitives';

// M2-A에서는 모든 화면을 이 팩토리로 만든다. 화면 내용은 M2-A의 범위가 아니다
// (docs/M2A-foundation-spec.md §8.3).
export function makePlaceholder(title: string, note?: string) {
  return function Placeholder() {
    return (
      <Screen>
        <EmptyState title={title} description={note ?? '준비 중입니다'} />
      </Screen>
    );
  };
}
