import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import { BACK_GUARD_SCREEN_LISTENERS } from '../backGuard';
import { DEFAULT_STACK_SCREEN_OPTIONS } from '../defaultStackScreenOptions';
import type { CineMapStackParamList } from '../types';

const Stack = createNativeStackNavigator<CineMapStackParamList>();

// 3군 — theater 테이블이 비어 있어 빈 지도가 나온다. 여유 시 착수.
export function CineMapStack() {
  return (
    <Stack.Navigator screenOptions={DEFAULT_STACK_SCREEN_OPTIONS} screenListeners={BACK_GUARD_SCREEN_LISTENERS}>
      <Stack.Screen
        name="CineMap"
        component={makePlaceholder('CineMap', '상영관 데이터 준비 중')}
        options={{ title: 'CineMap' }}
      />
    </Stack.Navigator>
  );
}
