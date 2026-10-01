import { ActivityIndicator, TextInput, View, type ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '../../theme/tokens';
import { ExtrudedText } from './ExtrudedText';

interface AppLoadingScreenProps {
  onLayout?: ViewProps['onLayout'];
}

// 앱 시작 시 홈 배경 포스터 프리페치가 끝날 때까지 보여주는 화면(§7.5, 2026-09-12 결정 —
// "완전 동시 공개" 대기를 홈 화면 위가 아니라 여기로 옮겨 팝인 자체가 안 보이게 한다).
//
// ⚠️ 로고 위치를 HomeScreen과 픽셀 단위로 맞춘다 — 여기서 홈으로 넘어갈 때 로고가 움직이면
// 전환이 끊겨 보인다. HomeScreen 레이아웃을 바꾸면 여기도 같이 바꿀 것:
//  ① 홈은 하단 탭바를 뺀 영역에서 중앙 정렬한다 → 탭바 높이(MainTabNavigator의 tabBarStyle과
//     같은 식)만큼 아래 여백을 둔다.
//  ② 홈은 "로고 + 검색창" 묶음을 중앙 정렬한다 → 검색창과 같은 높이의 자리를 두고 그 안에
//     스피너를 띄운다. 검색창 높이는 Android TextInput 기본 패딩 때문에 플랫폼마다 달라
//     숫자로 박지 않고, 같은 클래스의 보이지 않는 복제본으로 높이를 맞춘다.
// 로고 색(keylineColor 포함)도 홈과 동일하게 brandLight를 쓴다 — 전환 시 색이 바뀌어 보이지 않게.
export function AppLoadingScreen({ onLayout }: AppLoadingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingBottom: layout.tabBarHeight + insets.bottom }}
      onLayout={onLayout}
    >
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1">
        <View className="flex-1 items-center justify-center px-6">
          <ExtrudedText
            style={{ fontSize: 56, fontWeight: '700', color: colors.primary }}
            extrudeColor={colors.brandDeep}
            keylineColor={colors.brandLight}
          >
            CineMory
          </ExtrudedText>

          <View className="mt-8 w-full max-w-sm flex-row items-center px-4 py-4" pointerEvents="none">
            <View style={{ width: 20, height: 20 }} />
            <TextInput className="ml-3 flex-1 text-[15px]" editable={false} style={{ opacity: 0 }} />
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
