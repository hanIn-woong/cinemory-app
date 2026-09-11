// §7.5 계측 기준점 — 이 모듈이 App.tsx의 첫 import로 가장 먼저 평가되게 해서 "JS 번들 평가
// 시작"에 최대한 가까운 시각을 잡는다. App.tsx 안에 직접 두면 PosterBackdrop.tsx가 이걸
// 다시 import할 때 순환 참조(App → RootNavigator → … → PosterBackdrop → App)가 생겨 값이
// undefined로 읽힐 수 있어 독립 모듈로 분리했다. 조치가 끝나면 제거한다.
export const APP_T0 = Date.now();
