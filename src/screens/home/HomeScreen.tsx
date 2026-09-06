import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OutlinedText } from '../../components/common';
import { PosterBackdrop } from '../../components/home/PosterBackdrop';
import type { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

// ⚠️ 이 화면만 `Screen` 프리미티브를 쓰지 않는다 — `Screen`의 루트가 `SafeAreaView`라
// 배경(포스터 그리드)까지 안전영역 안쪽으로 잘려서 노치 위아래에 여백이 생긴다(§9.1).
// 배경은 `<View>` 루트에 꽉 채우고, 로고·검색바 같은 실제 콘텐츠만 안쪽 `SafeAreaView`로 감싼다.
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigation.navigate('SearchResult', { query: trimmed });
  }

  return (
    <View className="flex-1 bg-background">
      <PosterBackdrop />
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1">
        <View className="flex-1 items-center justify-center px-6">
          <OutlinedText
            style={{ fontSize: 56, fontWeight: '700', color: colors.primary }}
            outlineColor={[colors.brandDeep, colors.brandLight, colors.brandLight, colors.brandLight]}
          >
            CineMory
          </OutlinedText>

          <View
            className="mt-8 w-full max-w-sm flex-row items-center rounded-xl bg-card/90 px-4 py-4"
            style={searchBarShadow}
          >
            <Search size={20} color={colors.mutedForeground} />
            <TextInput
              className="ml-3 flex-1 text-[15px] text-foreground"
              placeholder="원하는 작품을 검색하세요"
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={submit}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// backdrop-blur는 뺀다 — 배경이 이미 opacity 0.2로 물러나 있어 반투명 배경만으로 충분하고,
// BlurView는 Android 성능만 먹는다(§9.1). 그림자는 플랫폼별로 분기한다.
const searchBarShadow = Platform.select({
  ios: { shadowColor: colors.foreground, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  android: { elevation: 4 },
});
