import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../../screens/home/HomeScreen';
import { MovieDetailScreen } from '../../screens/movie/MovieDetailScreen';
import { SearchResultScreen } from '../../screens/search/SearchResultScreen';
import type { HomeStackParamList } from '../types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SearchResult" component={SearchResultScreen} options={{ title: '검색 결과' }} />
      <Stack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{ headerTransparent: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
