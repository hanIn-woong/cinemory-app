import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { z } from 'zod';
import { ExtrudedText } from '../../components/common';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useGoogleLogin, useKakaoLogin, useLogin } from '../../hooks/useAuth';
import type { ApiError } from '../../api/client';
import type { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { applyServerErrors } from '../../utils/formErrors';

// 카카오·구글 원형 버튼 공통 크기 — 두 버튼을 나란히 같은 크기로 둔다(docs/google-login-spec.md §5)
const SOCIAL_BUTTON_SIZE = 52;

// 두 소셜 로그인이 공유하는 서버 에러 문구. 카카오 문구를 그대로 옮겼고 구글 전용 코드만 더했다.
function socialErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'OAUTH_EMAIL_NOT_PROVIDED':
      return '이메일 제공에 동의해야 가입할 수 있습니다';
    case 'EMAIL_ALREADY_REGISTERED':
      // 백엔드 V24 계정 연결(account-integrity S-7)로 개명. 서버가 가입 방법을 알려주지 않으므로
      // "이메일로 가입"이라고 단정하지 않는다 — 카카오를 연결한 다른 계정일 수도 있다.
      return '이미 가입된 이메일이에요. 기존에 가입한 방법으로 로그인해 주세요';
    case 'OAUTH_EMAIL_NOT_VERIFIED':
      return '구글 계정의 이메일 인증 후 다시 시도해 주세요';
    default:
      return error.message;
  }
}

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
  const googleLogin = useGoogleLogin();
  const [formError, setFormError] = useState<string | null>(null);
  // 소셜 에러는 한 자리 — 두 로그인이 동시에 진행되지 않으므로 두 줄이 같이 뜰 일이 없다
  const [socialError, setSocialError] = useState<string | null>(null);
  // 하나라도 진행 중이면 둘 다 막는다 — 동시에 nonce 두 개가 나가지 않게
  const socialPending = kakaoLogin.isPending || googleLogin.isPending;

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

  // tokens가 null이면 사용자가 로그인 도중 취소한 것 — 조용히 화면에 머무른다 (§11.1, google-login-spec §4).
  const socialCallbacks = {
    onSuccess: (tokens: unknown) => {
      if (tokens) navigation.goBack();
    },
    onError: (error: ApiError) => setSocialError(socialErrorMessage(error)),
  };

  const onKakaoPress = () => {
    setSocialError(null);
    kakaoLogin.mutate(undefined, socialCallbacks);
  };

  const onGooglePress = () => {
    setSocialError(null);
    googleLogin.mutate(undefined, socialCallbacks);
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center py-12"
      >
        {/* 홈 화면과 같은 입체 압출 로고 — 흰 배경이라 키라인은 brandLight 대신 shadowDeep을
            쓴다(docs/M2-frontend-spec.md §9.1 "② 로고" — brandLight는 흰 배경에서 거의 안 보임). */}
        <View className="items-center">
          <ExtrudedText
            style={{ fontSize: 40, fontWeight: '700', color: colors.primary }}
            extrudeColor={colors.brandDeep}
            keylineColor={colors.shadowDeep}
          >
            CineMory
          </ExtrudedText>
        </View>
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

        <Spacer size="lg" />
        <View className="flex-row justify-center gap-8">
          <View className="items-center">
            <Pressable
              onPress={onKakaoPress}
              disabled={socialPending}
              accessibilityLabel="카카오로 시작하기"
              className="items-center justify-center"
              style={{
                width: SOCIAL_BUTTON_SIZE,
                height: SOCIAL_BUTTON_SIZE,
                borderRadius: SOCIAL_BUTTON_SIZE / 2,
                backgroundColor: colors.kakaoYellow,
                opacity: socialPending ? 0.6 : 1,
              }}
            >
              {kakaoLogin.isPending ? (
                <ActivityIndicator color={colors.kakaoBubble} />
              ) : (
                <Svg width={24} height={22} viewBox="0 0 22 20">
                  <Path
                    d="M11 0C4.925 0 0 3.94 0 8.8c0 3.084 1.98 5.79 4.976 7.36L3.73 19.6a.5.5 0 00.74.56l4.53-3c.64.1 1.3.15 1.98.15 6.075 0 11-3.94 11-8.8C22 3.94 17.075 0 11 0z"
                    fill={colors.kakaoBubble}
                  />
                </Svg>
              )}
            </Pressable>
            <Spacer size="xs" />
            <Txt variant="caption" color="mutedForeground">
              카카오로 시작하기
            </Txt>
          </View>

          {/* 구글 브랜딩 가이드라인의 아이콘 버튼 — 흰 바탕 + 테두리 + 공식 4색 G(docs/google-login-spec.md §5).
              라이브러리 GoogleSignInButton은 Legacy Architecture 경고 때문에 쓰지 않는다. */}
          <View className="items-center">
            <Pressable
              onPress={onGooglePress}
              disabled={socialPending}
              accessibilityLabel="Google로 계속하기"
              className="items-center justify-center"
              style={{
                width: SOCIAL_BUTTON_SIZE,
                height: SOCIAL_BUTTON_SIZE,
                borderRadius: SOCIAL_BUTTON_SIZE / 2,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.googleButtonBorder,
                opacity: socialPending ? 0.6 : 1,
              }}
            >
              {googleLogin.isPending ? (
                <ActivityIndicator color={colors.googleBlue} />
              ) : (
                <Svg width={22} height={22} viewBox="0 0 48 48">
                  <Path
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    fill={colors.googleRed}
                  />
                  <Path
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    fill={colors.googleBlue}
                  />
                  <Path
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    fill={colors.googleYellow}
                  />
                  <Path
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    fill={colors.googleGreen}
                  />
                </Svg>
              )}
            </Pressable>
            <Spacer size="xs" />
            <Txt variant="caption" color="mutedForeground">
              Google로 계속하기
            </Txt>
          </View>
        </View>
        {socialError && (
          <>
            <Spacer size="sm" />
            <Txt variant="caption" color="destructive" className="text-center">
              {socialError}
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
