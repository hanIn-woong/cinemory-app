import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../../screens/home/HomeScreen';
import { MovieDetailScreen } from '../../screens/movie/MovieDetailScreen';
import { SearchResultScreen } from '../../screens/search/SearchResultScreen';
import { BACK_GUARD_SCREEN_LISTENERS } from '../backGuard';
import { DEFAULT_STACK_SCREEN_OPTIONS } from '../defaultStackScreenOptions';
import { MOVIE_DETAIL_OPTIONS } from '../movieDetailScreenOptions';
import type { HomeStackParamList } from '../types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={DEFAULT_STACK_SCREEN_OPTIONS} screenListeners={BACK_GUARD_SCREEN_LISTENERS}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SearchResult" component={SearchResultScreen} options={{ title: '검색 결과' }} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} options={MOVIE_DETAIL_OPTIONS} />
    </Stack.Navigator>
  );
}
