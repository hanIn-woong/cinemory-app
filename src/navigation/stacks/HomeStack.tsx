import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import type { HomeStackParamList } from '../types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={makePlaceholder('홈')} />
      <Stack.Screen name="SearchResult" component={makePlaceholder('검색 결과')} options={{ title: '검색 결과' }} />
      <Stack.Screen
        name="MovieDetail"
        component={makePlaceholder('영화 상세')}
        options={{ headerTransparent: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
