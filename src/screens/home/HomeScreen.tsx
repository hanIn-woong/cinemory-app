import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Spacer, TextField, Txt } from '../../components/primitives';
import type { HomeStackParamList } from '../../navigation/types';

// ⚠️ 배경 포스터 그리드·60초 애니메이션(§9.1)은 우선순위 낮음으로 명시돼 있어 아직 만들지
// 않았다 — SearchResult(§1 5번)를 검증할 수 있도록 검색 진입점만 먼저 둔다.
type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigation.navigate('SearchResult', { query: trimmed });
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Txt variant="h1" color="primary" className="text-center">
          CineMory
        </Txt>
        <Spacer size="xl" />
        <TextField
          placeholder="영화 제목을 검색해 보세요"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={submit}
        />
      </View>
    </Screen>
  );
}
