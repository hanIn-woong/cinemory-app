import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { z } from 'zod';
import { ActionSheet, AuthRequired, ErrorState, LoadingState } from '../../components/common';
import { Button, Card, Divider, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import {
  useChangePassword,
  useLogout,
  useMe,
  useUpdateNickname,
  useUpdatePrivacy,
} from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import type { PrivacySetting } from '../../types';
import { applyServerErrors } from '../../utils/formErrors';

const PRIVACY_LABEL: Record<PrivacySetting, string> = {
  PRIVATE: '비공개',
  FRIENDS: '친구 공개',
  PUBLIC: '전체 공개',
};

export function SettingsScreen() {
  // AuthModal로 직접 보내야 해서(§5.6 — 비밀번호 변경 후 "로그인 화면으로 보낸다") 이 화면
  // 자체 스택이 아니라 RootStackParamList로 타이핑한다(AuthRequired와 동일한 방식).
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const me = useMe();

  if (!isAuthed) {
    return <AuthRequired description="설정은 로그인 후 이용할 수 있어요" />;
  }

  if (me.isLoading) {
    return (
      <Screen>
        <LoadingState variant="detail" />
      </Screen>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Screen>
        <ErrorState message={me.error?.message} onRetry={() => me.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Spacer size="lg" />
        <NicknameSection currentNickname={me.data.nickname ?? ''} />
        <Spacer size="lg" />
        <PrivacySection currentPrivacy={me.data.privacySetting ?? 'PUBLIC'} />
        <Spacer size="lg" />
        <PasswordSection
          // ⚠️ 비밀번호 변경 성공 시 전 세션이 폐기된다 — 로그아웃 처리 후 로그인 화면으로 보낸다
          // (docs/M2B-screens-spec.md §5.6).
          onChanged={() => navigation.navigate('AuthModal', { screen: 'Login' })}
        />
        <Spacer size="lg" />
        <LogoutSection />
        <Spacer size="xl" />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function NicknameSection({ currentNickname }: { currentNickname: string }) {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const updateNickname = useUpdateNickname();

  function handleSave() {
    const trimmed = nickname.trim();
    if (trimmed.length === 0) {
      setError('닉네임을 입력해 주세요');
      return;
    }
    // 변경 API는 max 30 — 가입(max 50)과 비대칭이다(§5.1).
    if (trimmed.length > 30) {
      setError('닉네임은 최대 30자입니다');
      return;
    }
    setError(null);
    updateNickname.mutate(trimmed, {
      onError: (e) => setError(e.message),
    });
  }

  return (
    <Card>
      <Txt variant="h4">닉네임</Txt>
      <Spacer size="sm" />
      <TextField
        value={nickname}
        onChangeText={setNickname}
        error={error ?? undefined}
        placeholder="닉네임 (최대 30자)"
      />
      <Spacer size="sm" />
      <Button
        variant="secondary"
        loading={updateNickname.isPending}
        disabled={nickname.trim() === currentNickname}
        onPress={handleSave}
      >
        저장
      </Button>
    </Card>
  );
}

function PrivacySection({ currentPrivacy }: { currentPrivacy: PrivacySetting }) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const updatePrivacy = useUpdatePrivacy();

  const options = (Object.keys(PRIVACY_LABEL) as PrivacySetting[]).map((value) => ({
    label: PRIVACY_LABEL[value] + (value === currentPrivacy ? ' (현재)' : ''),
    onPress: () => {
      if (value === currentPrivacy) return;
      updatePrivacy.mutate(value, { onError: (e) => Alert.alert('변경 실패', e.message) });
    },
  }));

  return (
    <Card>
      <Pressable
        className="flex-row items-center justify-between"
        onPress={() => setSheetVisible(true)}
        disabled={updatePrivacy.isPending}
      >
        <Txt variant="h4">공개범위</Txt>
        <Txt variant="body" color="mutedForeground">
          {PRIVACY_LABEL[currentPrivacy]}
        </Txt>
      </Pressable>
      <ActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="공개범위 변경"
        options={options}
      />
    </Card>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요'),
    newPassword: z.string().min(8, '비밀번호는 8~64자여야 합니다').max(64, '비밀번호는 8~64자여야 합니다'),
    newPasswordConfirm: z.string().min(1, '새 비밀번호를 한 번 더 입력해 주세요'),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['newPasswordConfirm'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function PasswordSection({ onChanged }: { onChanged: () => void }) {
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  const onSubmit = handleSubmit(({ newPasswordConfirm: _newPasswordConfirm, ...body }) => {
    setFormError(null);
    changePassword.mutate(body, {
      onSuccess: () => {
        reset();
        Alert.alert('비밀번호가 변경됐습니다', '보안을 위해 다시 로그인해 주세요', [
          { text: '확인', onPress: onChanged },
        ]);
      },
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    });
  });

  return (
    <Card>
      <Txt variant="h4">비밀번호 변경</Txt>
      <Spacer size="sm" />
      <Controller
        control={control}
        name="currentPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="현재 비밀번호"
            secureTextEntry
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.currentPassword?.message}
          />
        )}
      />
      <Spacer size="sm" />
      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="새 비밀번호 (8~64자)"
            secureTextEntry
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.newPassword?.message}
          />
        )}
      />
      <Spacer size="sm" />
      <Controller
        control={control}
        name="newPasswordConfirm"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="새 비밀번호 확인"
            secureTextEntry
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.newPasswordConfirm?.message}
          />
        )}
      />
      {formError && (
        <>
          <Spacer size="xs" />
          <Txt variant="caption" color="destructive">
            {formError}
          </Txt>
        </>
      )}
      <Spacer size="sm" />
      <Button variant="secondary" loading={changePassword.isPending} onPress={onSubmit}>
        변경하기
      </Button>
    </Card>
  );
}

function LogoutSection() {
  const logout = useLogout();
  return (
    <View>
      <Divider />
      <Spacer size="lg" />
      <Button variant="danger" loading={logout.isPending} onPress={() => logout.mutate()}>
        로그아웃
      </Button>
    </View>
  );
}
