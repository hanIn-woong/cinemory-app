import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import type { RecommendStackParamList } from '../types';

const Stack = createNativeStackNavigator<RecommendStackParamList>();

// 3군 — M3-b 설계 미결(R-2: 규칙 기반 vs 임베딩). 여유 시 착수.
export function RecommendStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Recommend"
        component={makePlaceholder('추천', '추천 설계 미결로 준비 중')}
        options={{ title: '추천' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={makePlaceholder('영화 상세')}
        options={{ headerTransparent: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
