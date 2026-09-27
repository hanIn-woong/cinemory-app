export const colors = {
  background: '#FFFFFF',
  foreground: '#252525',
  card: '#FFFFFF',
  primary: '#14D9D9',
  primaryForeground: '#FFFFFF',
  brandDeep: '#37BEB0',
  brandLight: '#DBF5F0',
  // ExtrudedText 키라인 전용 — 흰 배경(스플래시·로그인)에서 brandLight가 거의 안 보여서
  // 추가했다(docs/M2-frontend-spec.md §9.1 "② 로고" 표). brandLight(밝은 테두리)와 반대로
  // 그림자처럼 뒤로 물러나 보여야 흰 배경에서 또렷하다.
  shadowDeep: '#1F7A72',
  muted: '#ECECF0',
  mutedForeground: '#717182',
  accent: '#E9EBEF',
  destructive: '#D4183D',
  border: 'rgba(0,0,0,0.1)',
  inputBackground: '#F3F3F5',
  star: '#FACC15',
} as const;

export const radius = { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const layout = { tabBarHeight: 64, posterAspectRatio: 2 / 3, screenPadding: 16 } as const;

export const posterFallbackPalette = [
  '#4A90E2', '#7B68EE', '#FF69B4', '#FFD700', '#FF6347', '#32CD32', '#9370DB', '#FF8C00',
] as const;

// CollectionShelfCard 전용 — 선반 색은 반드시 여기를 참조한다(docs/M2C-screens-spec.md §5.2).
// A(나무 선반) ↔ B(뉴트럴 렛지, 현재 채택) 전환을 hex 6개 교체로 끝내기 위한 것 —
// 컴포넌트에 색을 박으면 카드·빈 상태·스켈레톤을 전부 찾아다녀야 한다.
export const shelf = {
  boardTop: '#FFFFFF',
  boardMid: '#E4E6EB',
  boardBottom: '#D3D6DD',
  edgeTop: '#C2C6CE',
  edgeBottom: '#AFB4BE',
  groundShadow: 'rgba(0,0,0,0.34)',
  // 포스터 뒤 "벽" — 카드 흰 바탕과 달라야 선반 위에 물건이 놓인 깊이가 읽힌다(2026-09-27).
  // 브랜드 딥(#37BEB0) — 테두리(primary #14D9D9)보다 한 단계 깊은 같은 계열이라 벽이 뒤로
  // 물러나 보인다. 경위(2026-09-27): brandLight+brandDeep 테두리 조합 어색 → primary 채도만 낮춘
  // #4DA0A0 탁함 → primary 명도 85% #B9F9F9 → 사용자 선택으로 brandDeep.
  wall: colors.brandDeep,
  cardBorder: colors.primary,
} as const;

// typography variant 클래스의 단일 출처는 src/components/primitives/Txt.tsx다 (§2).
