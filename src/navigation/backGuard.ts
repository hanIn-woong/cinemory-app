// Android native-stack은 화면 전환을 Fragment 트랜잭션으로 처리한다 — push 트랜잭션이
// 끝나기 전(transitionStart~transitionEnd 사이) pop이 들어오면 트랜잭션이 겹쳐 화면이
// 빈 프레임으로 남는다(전 화면 뒤로가기에서 재현, 원인·이분 탐색 경위는
// docs/M2-frontend-spec.md §8.6). 애니메이션은 그대로 두고 그 시간 창의 뒤로가기만
// 막는다 — beforeRemove는 하드웨어 back·헤더 back 버튼·스와이프 제스처를 전부 같은
// 지점에서 가로채는 React Navigation 표준 API라 트리거별로 따로 처리할 필요가 없다.
//
// 카운터를 쓰는 이유 — 화면 전환 하나에 나가는 화면(closing:true)과 들어오는 화면
// (closing:false) 양쪽에서 transitionStart/End가 한 쌍씩 따로 온다. boolean이면 둘 중
// 하나가 먼저 끝났을 때 다른 하나가 진행 중이어도 꺼져버린다.
let transitionCount = 0;

type TransitionEvent = { data: { closing: boolean } };
type BeforeRemoveEvent = { preventDefault: () => void };

function markTransitionStart(_e: TransitionEvent) {
  transitionCount += 1;
}

function markTransitionEnd(_e: TransitionEvent) {
  transitionCount = Math.max(0, transitionCount - 1);
}

function guardBeforeRemove(e: BeforeRemoveEvent) {
  if (transitionCount > 0) {
    e.preventDefault();
  }
}

// 모든 Stack.Navigator의 screenListeners에 그대로 꽂는다 — 한 곳만 고치면
// Root·Auth·Home·MyPage·Social·Recommend·CineMap 전부에 적용된다.
export const BACK_GUARD_SCREEN_LISTENERS = {
  transitionStart: markTransitionStart,
  transitionEnd: markTransitionEnd,
  beforeRemove: guardBeforeRemove,
};
