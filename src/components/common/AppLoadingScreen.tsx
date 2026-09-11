import { ActivityIndicator, View, type ViewProps } from 'react-native';
import { colors } from '../../theme/tokens';
import { ExtrudedText } from './ExtrudedText';

interface AppLoadingScreenProps {
  onLayout?: ViewProps['onLayout'];
}

// 앱 시작 시 홈 배경 포스터 프리페치가 끝날 때까지 보여주는 화면(§7.5, 2026-09-12 결정 —
// "완전 동시 공개" 대기를 홈 화면 위가 아니라 여기로 옮겨 팝인 자체가 안 보이게 한다).
// 흰 배경이라 로그인 화면과 같은 이유로 keylineColor는 brandLight 대신 shadowDeep을 쓴다.
export function AppLoadingScreen({ onLayout }: AppLoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background" onLayout={onLayout}>
      <ExtrudedText
        style={{ fontSize: 56, fontWeight: '700', color: colors.primary }}
        extrudeColor={colors.brandDeep}
        keylineColor={colors.shadowDeep}
      >
        CineMory
      </ExtrudedText>
      <View className="mt-8">
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    </View>
  );
}
