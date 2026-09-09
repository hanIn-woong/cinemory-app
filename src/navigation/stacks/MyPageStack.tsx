import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import { MovieDetailScreen } from '../../screens/movie/MovieDetailScreen';
import { MyPageScreen } from '../../screens/mypage/MyPageScreen';
import { SettingsScreen } from '../../screens/mypage/SettingsScreen';
import { MyRecordsScreen } from '../../screens/records/MyRecordsScreen';
import { WishlistScreen } from '../../screens/wishlist/WishlistScreen';
import type { MyPageStackParamList } from '../types';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

export function MyPageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이페이지' }} />
      <Stack.Screen name="EditProfile" component={makePlaceholder('프로필 수정')} options={{ title: '프로필 수정' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
      <Stack.Screen name="MyRecords" component={MyRecordsScreen} options={{ title: '내 기록' }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: '찜한 작품' }} />
      <Stack.Screen name="CollectionList" component={makePlaceholder('컬렉션')} options={{ title: '컬렉션' }} />
      <Stack.Screen name="CollectionDetail" component={makePlaceholder('컬렉션')} options={{ title: '컬렉션' }} />
      <Stack.Screen
        name="Report"
        component={makePlaceholder('리포트', 'M3-a 미구현 — 2군')}
        options={{ title: '리포트' }}
      />
      <Stack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{ headerTransparent: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
