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

export type MyPageStackParamList = {
  MyPage: undefined;
  EditProfile: undefined;
  Settings: undefined;
  MyRecords: undefined;
  Wishlist: undefined;
  CollectionList: undefined;
  // ⚠️ description도 함께 넘긴다 — CollectionUpdateRequest가 전체 치환이라 description을
  // 모르면 수정 폼을 열 때마다 설명이 지워진다(단건 조회 API 부재, docs/M2C-screens-spec.md §5.3).
  CollectionDetail: { collectionId: number; title: string; description?: string }; // ⚠️ 단건 조회 API 부재 → title 동반 전달
  Report: undefined; // 2군
  MovieDetail: { movieId: number };
};
