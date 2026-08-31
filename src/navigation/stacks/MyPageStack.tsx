import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import { MyPageScreen } from '../../screens/mypage/MyPageScreen';
import type { MyPageStackParamList } from '../types';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

export function MyPageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이페이지' }} />
      <Stack.Screen name="EditProfile" component={makePlaceholder('프로필 수정')} options={{ title: '프로필 수정' }} />
      <Stack.Screen name="Settings" component={makePlaceholder('설정')} options={{ title: '설정' }} />
      <Stack.Screen name="MyRecords" component={makePlaceholder('내 기록')} options={{ title: '내 기록' }} />
      <Stack.Screen name="Wishlist" component={makePlaceholder('찜한 작품')} options={{ title: '찜한 작품' }} />
      <Stack.Screen name="CollectionList" component={makePlaceholder('컬렉션')} options={{ title: '컬렉션' }} />
      <Stack.Screen name="CollectionDetail" component={makePlaceholder('컬렉션')} options={{ title: '컬렉션' }} />
      <Stack.Screen
        name="Report"
        component={makePlaceholder('리포트', 'M3-a 미구현 — 2군')}
        options={{ title: '리포트' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={makePlaceholder('영화 상세')}
        options={{ headerTransparent: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
