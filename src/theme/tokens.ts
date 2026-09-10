export const colors = {
  background: '#FFFFFF',
  foreground: '#252525',
  card: '#FFFFFF',
  primary: '#14D9D9',
  primaryForeground: '#FFFFFF',
  brandDeep: '#37BEB0',
  brandLight: '#DBF5F0',
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
} as const;

// typography variant 클래스의 단일 출처는 src/components/primitives/Txt.tsx다 (§2).
