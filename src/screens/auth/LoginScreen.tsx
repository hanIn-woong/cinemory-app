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
import { useKakaoLogin, useLogin } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { applyServerErrors } from '../../utils/formErrors';

const KAKAO_BUTTON_SIZE = 52;

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
        } else if (error.code === 'EMAIL_ALREADY_REGISTERED') {
          // 백엔드 V24 계정 연결(account-integrity S-7)로 개명. 서버가 가입 방법을 알려주지 않으므로
          // "이메일로 가입"이라고 단정하지 않는다 — 카카오를 연결한 다른 계정일 수도 있다.
          setKakaoError('이미 가입된 이메일이에요. 기존에 가입한 방법으로 로그인해 주세요');
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
        <View className="items-center">
          <Pressable
            onPress={onKakaoPress}
            disabled={kakaoLogin.isPending}
            accessibilityLabel="카카오로 시작하기"
            className="items-center justify-center"
            style={{
              width: KAKAO_BUTTON_SIZE,
              height: KAKAO_BUTTON_SIZE,
              borderRadius: KAKAO_BUTTON_SIZE / 2,
              backgroundColor: colors.kakaoYellow,
              opacity: kakaoLogin.isPending ? 0.6 : 1,
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
