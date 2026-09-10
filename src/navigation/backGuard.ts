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
//
// ⚠️ 천장(MAX_TRANSITION_MS)이 없으면 카운터가 샐 때 뒤로가기가 영구히 막힌다 —
// transitionStart가 짝 없이 끝나면(전환 중 화면 파괴·앱 백그라운드 전환·네비게이터
// 언마운트) transitionCount가 1 이상으로 남아 원래 버그보다 나쁜 상태(영구 잠금, 앱
// 재시작 전엔 복구 불가)가 된다. 7개 네비게이터가 이 카운터를 전역으로 공유해 누수
// 기회가 그만큼 많다 — 정상 경로는 이벤트 기반 그대로 두고, 누수했을 때만 시간으로
// 강제 해제한다(§8.6).
const MAX_TRANSITION_MS = 1000; // 어떤 전환도 이보다 길 수 없다
// ⚠️ 개발 중 Fast Refresh는 이 모듈 레벨 상태를 초기화하지 않는다 — 갑자기 뒤로가기가
// 안 먹으면 코드 문제가 아니라 누수된 카운터일 수 있다. 풀 리로드부터 의심할 것.
let transitionCount = 0;
let lastStartAt = 0;

type TransitionEvent = { data: { closing: boolean } };
type BeforeRemoveEvent = { preventDefault: () => void };

function markTransitionStart(_e: TransitionEvent) {
  transitionCount += 1;
  lastStartAt = Date.now();
}

function markTransitionEnd(_e: TransitionEvent) {
  transitionCount = Math.max(0, transitionCount - 1);
}

function guardBeforeRemove(e: BeforeRemoveEvent) {
  if (transitionCount > 0 && Date.now() - lastStartAt < MAX_TRANSITION_MS) {
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
