import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { z } from 'zod';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useKakaoLogin, useLogin } from '../../hooks/useAuth';
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
  const kakaoLogin = useKakaoLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const [kakaoError, setKakaoError] = useState<string | null>(null);

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
      // 게스트 우선 전환 이후 유일하게 화면에서 수동 navigate하는 지점이다 — 로그인은
      // 모달이라 명시적으로 닫아야 한다(docs/M2-frontend-spec.md §6.7). 탭 스택 자체를
      // 갈아끼우는 것이 아니므로 M2-A의 "수동 navigate 금지" 규칙이 막던 사고(로그아웃 후
      // 이전 사용자 화면이 스택에 남는 것)는 여기서 발생하지 않는다.
      onSuccess: () => navigation.goBack(),
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    });
  });

  const onKakaoPress = () => {
    setKakaoError(null);
    kakaoLogin.mutate(undefined, {
      // tokens가 null이면 사용자가 로그인 도중 취소한 것 — 조용히 화면에 머무른다 (§11.1).
      onSuccess: (tokens) => {
        if (tokens) navigation.goBack();
      },
      onError: (error) => {
        if (error.code === 'OAUTH_EMAIL_NOT_PROVIDED') {
          setKakaoError('이메일 제공에 동의해야 가입할 수 있습니다');
        } else if (error.code === 'EMAIL_ALREADY_REGISTERED_LOCALLY') {
          setKakaoError('이미 이메일로 가입된 계정이에요. 이메일 로그인을 이용해 주세요');
        } else {
          setKakaoError(error.message);
        }
      },
    });
  };

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
        <Button variant="secondary" onPress={onKakaoPress} loading={kakaoLogin.isPending}>
          카카오로 시작하기
        </Button>
        {kakaoError && (
          <>
            <Spacer size="sm" />
            <Txt variant="caption" color="destructive">
              {kakaoError}
            </Txt>
          </>
        )}

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
