import type { NavigatorScreenParams } from '@react-navigation/native';

// 게스트 우선(docs/M2-frontend-spec.md §6.7) — status로 분기하지 않는다. Main은 항상 뜨고
// AuthModal은 로그인이 필요한 순간에만 push되는 모달 스택이다.
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  AuthModal: NavigatorScreenParams<AuthStackParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  PasswordResetRequest: undefined;
  PasswordResetConfirm: { token: string }; // 메일 딥링크로 진입
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  RecommendTab: NavigatorScreenParams<RecommendStackParamList>;
  CineMapTab: NavigatorScreenParams<CineMapStackParamList>;
  SocialTab: NavigatorScreenParams<SocialStackParamList>;
  MyPageTab: NavigatorScreenParams<MyPageStackParamList>;
};

export type HomeStackParamList = {
  Home: undefined;
  SearchResult: { query: string };
  MovieDetail: { movieId: number }; // ★ 객체가 아니라 ID
};

export type RecommendStackParamList = {
  Recommend: undefined;
  MovieDetail: { movieId: number };
};

export type CineMapStackParamList = {
  CineMap: undefined;
};

export type SocialStackParamList = {
  Social: undefined;
  MovieDetail: { movieId: number };
  // ⚠️ description도 함께 넘긴다 — CollectionUpdateRequest가 전체 치환이라 description을
  // 모르면 수정 폼을 열 때마다 설명이 지워진다(단건 조회 API 부재, docs/M2C-screens-spec.md §5.3).
  CollectionDetail: { collectionId: number; title: string; description?: string };
};

// MyLibrary 안의 상단 탭(스와이프). 탭 이름이 곧 initialTab 값이다.
export type LibraryTab = 'records' | 'wishes';
export type LibraryTabParamList = {
  records: undefined;
  wishes: undefined;
};

export type MyPageStackParamList = {
  MyPage: undefined;
  EditProfile: undefined;
  Settings: undefined;
  // 내 기록·찜 목록 통합(docs/library-sort-spec.md §3.3). 마이페이지 진입점은 `내 기록` 하나이고
  // 기본 탭은 records다. initialTab은 찜 탭으로 바로 여는 경로(소셜·딥링크 등)용으로 남겨 둔다.
  MyLibrary: { initialTab?: LibraryTab } | undefined;
  CollectionList: undefined;
  // ⚠️ description도 함께 넘긴다 — CollectionUpdateRequest가 전체 치환이라 description을
  // 모르면 수정 폼을 열 때마다 설명이 지워진다(단건 조회 API 부재, docs/M2C-screens-spec.md §5.3).
  CollectionDetail: { collectionId: number; title: string; description?: string }; // ⚠️ 단건 조회 API 부재 → title 동반 전달
  // 컬렉션 상세 ⋮ → 영화 편집(추가·삭제·순서). 진입 시 전량을 다시 받으므로 ID만 넘긴다.
  CollectionEdit: { collectionId: number };
  Report: undefined;
  Calendar: undefined;
  MonthlyReport: { year: number; month: number };
  MovieDetail: { movieId: number };
};
