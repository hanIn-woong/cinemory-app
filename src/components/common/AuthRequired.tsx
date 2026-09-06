import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { View } from 'react-native';
import type { RootStackParamList } from '../../navigation/types';
import { Button } from '../primitives/Button';
import { Screen } from '../primitives/Screen';
import { Spacer } from '../primitives/Spacer';
import { Txt } from '../primitives/Txt';

interface AuthRequiredProps {
  title?: string;
  description?: string;
}

// 화면 게이트 — 화면 전체가 로그인 필요할 때 쓴다(마이페이지 등). 안내 + 로그인 버튼만
// 보여주고, 버튼을 누르면 AuthModal이 뜬다 (docs/M2-frontend-spec.md §6.7).
export function AuthRequired({ title = '로그인이 필요합니다', description }: AuthRequiredProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        <Txt variant="h4" className="text-center">
          {title}
        </Txt>
        {description && (
          <>
            <Spacer size="xs" />
            <Txt variant="caption" color="mutedForeground" className="text-center">
              {description}
            </Txt>
          </>
        )}
        <Spacer size="lg" />
        <Button onPress={() => navigation.navigate('AuthModal', { screen: 'Login' })}>로그인</Button>
      </View>
    </Screen>
  );
}
