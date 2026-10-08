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
  // 포스터 위에 얹는 배지 배경(캘린더 날짜 칸) — 어떤 포스터 위에서도 흰 글씨가 읽히게 반투명 검정.
  scrim: 'rgba(0,0,0,0.55)',
  inputBackground: '#F3F3F5',
  star: '#FACC15',
  // 카카오 브랜드 컬러 — 공식 가이드 고정값(임의 선택 아님). 다른 색과 섞어 쓰지 않는다.
  kakaoYellow: '#FEE500',
  kakaoBubble: '#191919',
} as const;

export const radius = { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const layout = { tabBarHeight: 64, posterAspectRatio: 2 / 3, screenPadding: 16 } as const;

// 별점 버킷(서버 정수 1~10 = 0.5~5.0점) 색 — 순서가 있는 값이라 순차 팔레트. 인덱스 = 버킷 − 1.
// ★ 5.0점 = primary(#14D9D9), 점수가 낮을수록 같은 색상·채도(HSL 180°/83%)로 어두워진다(2026-09-28 4차,
// 사용자 선택 — "최고점이 브랜드 색"). 명도 값은 HSL 등간격이 아니라 OKLab 인접 ΔE가 같도록 골랐고,
// 명도 예산은 실측상 별점이 몰린 2.5~5.0점(백엔드 M3a 실측)에 쓴다 — 그 6단계 인접 ΔE≈10.
// 거의 안 쓰이는 0.5~2.0점은 어두운 끝(HSL L 5→10%)에 좁게 모았다(ΔE≈3, 범례 라벨로 구분).
// ⚠️ brandDeep(#37BEB0)↔primary 두 색 사이를 섞는 안은 기각 — 두 끝점 ΔE가 8.1뿐이라 10단계면 인접 ≈0.9.
// 조각 사이 2px 간격(ReportPieChart)과 범례의 점수 라벨이 함께 구분을 돕는다.
// ⚠️ 색은 점수에 고정한다 — 그달에 있는 조각 수로 다시 칠하지 않는다(4.0점은 어느 달이든 같은 색).
export const ratingScale = [
  '#021717', '#031F1F', '#042727', '#042F2F', // 0.5~2.0 — 드묾, 어두운 끝에 좁게
  '#053838', '#085555', '#0B7474', '#0E9494', '#11B6B6', '#14D9D9', // 2.5~5.0 — 인접 ΔE≈10, 5.0 = primary
] as const;

export const posterFallbackPalette = [
  '#4A90E2', '#7B68EE', '#FF69B4', '#FFD700', '#FF6347', '#32CD32', '#9370DB', '#FF8C00',
] as const;

// ShelfRow(컬렉션 카드·상세 공용) 전용 — 선반 색은 반드시 여기를 참조한다(docs/M2C-screens-spec.md §5.2·§5.3).
// A(나무 선반) ↔ B(뉴트럴 렛지) 전환을 hex 6개 교체로 끝내기 위한 것 —
// 컴포넌트에 색을 박으면 카드·빈 상태·스켈레톤을 전부 찾아다녀야 한다.
export const shelf = {
  // 선반 판 = 목재(2026-10-02 사용자 결정 — 뉴트럴 렛지의 흰·회색 판이 청록 벽 위에서 떠 보였다).
  // 위 밝고 아래 어둡게 해 두께가 읽히는 구조는 그대로, 색만 갈색 계열로 바꿨다. 벽은 그대로 청록.
  boardTop: '#C9996B',
  boardMid: '#A8764B',
  boardBottom: '#8A5D38',
  edgeTop: '#74492B',
  edgeBottom: '#5E3B22',
  groundShadow: 'rgba(0,0,0,0.34)',
  // 포스터 뒤 "벽" — 카드 흰 바탕과 달라야 선반 위에 물건이 놓인 깊이가 읽힌다(2026-09-27).
  // 브랜드 딥(#37BEB0) — 테두리(primary #14D9D9)보다 한 단계 깊은 같은 계열이라 벽이 뒤로
  // 물러나 보인다. 경위(2026-09-27): brandLight+brandDeep 테두리 조합 어색 → primary 채도만 낮춘
  // #4DA0A0 탁함 → primary 명도 85% #B9F9F9 → 사용자 선택으로 brandDeep.
  wall: colors.brandDeep,
  cardBorder: colors.primary,
} as const;

// typography variant 클래스의 단일 출처는 src/components/primitives/Txt.tsx다 (§2).
