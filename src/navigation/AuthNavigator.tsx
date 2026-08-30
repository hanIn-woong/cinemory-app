import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../screens/_placeholder';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={makePlaceholder('로그인')} />
      <Stack.Screen name="SignUp" component={makePlaceholder('회원가입')} />
      <Stack.Screen name="PasswordResetRequest" component={makePlaceholder('비밀번호 재설정')} />
      <Stack.Screen name="PasswordResetConfirm" component={makePlaceholder('새 비밀번호 설정')} />
    </Stack.Navigator>
  );
}
