import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// MovieDetail이 4개 스택(Home·MyPage·Social·Recommend)에 등록돼 있다. 여기서 한 곳만
// 바꿔 전부에 적용한다 — 개별 스택 파일에 복붙하면 나중에 한 곳만 고치고 나머지를
// 놓치기 쉽다.
export const MOVIE_DETAIL_OPTIONS: NativeStackNavigationOptions = {
  headerTransparent: true,
  title: '',
};
