import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { makePlaceholder } from '../screens/_placeholder';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="PasswordResetRequest" component={makePlaceholder('비밀번호 재설정')} />
      <Stack.Screen name="PasswordResetConfirm" component={makePlaceholder('새 비밀번호 설정')} />
    </Stack.Navigator>
  );
}
