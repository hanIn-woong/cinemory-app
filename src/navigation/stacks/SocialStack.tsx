import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import type { SocialStackParamList } from '../types';

const Stack = createNativeStackNavigator<SocialStackParamList>();

// 3군 — 와이어프레임의 "활동 피드"에 대응하는 엔드포인트가 없다. 여유 시 착수.
export function SocialStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Social"
        component={makePlaceholder('소셜', '활동 피드 API 준비 중')}
        options={{ title: '소셜' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={makePlaceholder('영화 상세')}
        options={{ headerTransparent: true, title: '' }}
      />
      <Stack.Screen name="CollectionDetail" component={makePlaceholder('컬렉션')} options={{ title: '컬렉션' }} />
    </Stack.Navigator>
  );
}
