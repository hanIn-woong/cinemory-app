import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import { BACK_GUARD_SCREEN_LISTENERS } from '../backGuard';
import { DEFAULT_STACK_SCREEN_OPTIONS } from '../defaultStackScreenOptions';
import { MOVIE_DETAIL_OPTIONS } from '../movieDetailScreenOptions';
import type { RecommendStackParamList } from '../types';

const Stack = createNativeStackNavigator<RecommendStackParamList>();

// 3군 — M3-b 설계 미결(R-2: 규칙 기반 vs 임베딩). 여유 시 착수.
export function RecommendStack() {
  return (
    <Stack.Navigator screenOptions={DEFAULT_STACK_SCREEN_OPTIONS} screenListeners={BACK_GUARD_SCREEN_LISTENERS}>
      <Stack.Screen
        name="Recommend"
        component={makePlaceholder('추천', '추천 설계 미결로 준비 중')}
        options={{ title: '추천' }}
      />
      <Stack.Screen name="MovieDetail" component={makePlaceholder('영화 상세')} options={MOVIE_DETAIL_OPTIONS} />
    </Stack.Navigator>
  );
}
