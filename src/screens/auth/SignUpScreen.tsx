import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { z } from 'zod';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { ScreenHeader } from '../../components/common';
import { useSignUp } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/types';
import { applyServerErrors } from '../../utils/formErrors';

const schema = z
  .object({
    email: z.string().min(1, '이메일을 입력해 주세요').email('올바른 이메일 형식이 아닙니다'),
    rawPassword: z
      .string()
      .min(8, '비밀번호는 8~64자여야 합니다')
      .max(64, '비밀번호는 8~64자여야 합니다'),
    passwordConfirm: z.string().min(1, '비밀번호를 한 번 더 입력해 주세요'),
    // 가입 닉네임은 max 50 — 변경 API(max 30)와 비대칭이다 (docs/M2B-screens-spec.md §5.1).
    nickname: z.string().min(1, '닉네임을 입력해 주세요').max(50, '닉네임은 최대 50자입니다'),
  })
  .refine((v) => v.rawPassword === v.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  });

type FormValues = z.infer<typeof schema>;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

export function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const signUp = useSignUp();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', rawPassword: '', passwordConfirm: '', nickname: '' },
  });

  const onSubmit = handleSubmit(({ passwordConfirm: _passwordConfirm, ...body }) => {
    setFormError(null);
    signUp.mutate(body, {
      onSuccess: () => {
        Alert.alert('가입 완료', '이제 로그인해 주세요', [
          { text: '확인', onPress: () => navigation.navigate('Login') },
        ]);
      },
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    });
  });

  return (
    <Screen scroll>
      <ScreenHeader title="회원가입" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="py-6">
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
          name="rawPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="비밀번호 (8~64자)"
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.rawPassword?.message}
            />
          )}
        />
        <Spacer size="md" />
        <Controller
          control={control}
          name="passwordConfirm"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="비밀번호 확인"
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.passwordConfirm?.message}
            />
          )}
        />
        <Spacer size="md" />
        <Controller
          control={control}
          name="nickname"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="닉네임 (최대 50자)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.nickname?.message}
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
        <Button onPress={onSubmit} loading={signUp.isPending}>
          가입하기
        </Button>
      </KeyboardAvoidingView>
    </Screen>
  );
}
