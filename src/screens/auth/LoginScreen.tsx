import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { z } from 'zod';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useLogin } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/types';
import { applyServerErrors } from '../../utils/formErrors';

const schema = z.object({
  email: z.string().min(1, '이메일을 입력해 주세요').email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해 주세요'),
});

type FormValues = z.infer<typeof schema>;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    });
  });

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center py-12"
      >
        <Txt variant="h1" color="primary" className="text-center">
          CineMory
        </Txt>
        <Spacer size="xl" />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="이메일"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Spacer size="md" />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="비밀번호"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        {formError && (
          <>
            <Spacer size="sm" />
            <Txt variant="caption" color="destructive">
              {formError}
            </Txt>
          </>
        )}

        <Spacer size="lg" />
        <Button onPress={onSubmit} loading={login.isPending}>
          로그인
        </Button>

        <Spacer size="md" />
        {/* 카카오 SDK는 prebuild가 필요해 아직 붙이지 않는다 (docs/M2-frontend-spec.md §11.1) */}
        <Button variant="secondary" disabled>
          카카오로 시작하기
        </Button>

        <Spacer size="xl" />
        <View className="flex-row items-center justify-center">
          <Pressable onPress={() => navigation.navigate('SignUp')} hitSlop={8}>
            <Txt variant="caption" color="primary">
              회원가입
            </Txt>
          </Pressable>
          <Txt variant="caption" color="mutedForeground">
            {'   ·   '}
          </Txt>
          <Pressable onPress={() => navigation.navigate('PasswordResetRequest')} hitSlop={8}>
            <Txt variant="caption" color="primary">
              비밀번호 찾기
            </Txt>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
