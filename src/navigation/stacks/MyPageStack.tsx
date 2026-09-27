import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../../screens/_placeholder';
import { CollectionDetailScreen } from '../../screens/collection/CollectionDetailScreen';
import { CollectionListScreen } from '../../screens/collection/CollectionListScreen';
import { MyLibraryScreen } from '../../screens/library/MyLibraryScreen';
import { MovieDetailScreen } from '../../screens/movie/MovieDetailScreen';
import { MyPageScreen } from '../../screens/mypage/MyPageScreen';
import { SettingsScreen } from '../../screens/mypage/SettingsScreen';
import { CalendarScreen } from '../../screens/report/CalendarScreen';
import { MonthlyReportScreen } from '../../screens/report/MonthlyReportScreen';
import { ReportScreen } from '../../screens/report/ReportScreen';
import { MOVIE_DETAIL_OPTIONS } from '../movieDetailScreenOptions';
import type { MyPageStackParamList } from '../types';

const Stack = createNativeStackNavigator<MyPageStackParamList>();

export function MyPageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이페이지' }} />
      <Stack.Screen name="EditProfile" component={makePlaceholder('프로필 수정')} options={{ title: '프로필 수정' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
      <Stack.Screen name="MyLibrary" component={MyLibraryScreen} options={{ title: '내 서재' }} />
      <Stack.Screen name="CollectionList" component={CollectionListScreen} options={{ title: '내 컬렉션' }} />
      <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={{ title: '컬렉션' }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: '시청 분석 리포트' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: '캘린더' }} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: '이달의 리포트' }} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} options={MOVIE_DETAIL_OPTIONS} />
    </Stack.Navigator>
  );
}
