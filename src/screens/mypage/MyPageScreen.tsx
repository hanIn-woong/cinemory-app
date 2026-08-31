import { Button, Card, Screen, Spacer, Txt } from '../../components/primitives';
import { ErrorState, LoadingState } from '../../components/common';
import { useLogout, useMe } from '../../hooks/useAuth';

// ⚠️ MyPage/Settings 본구현은 M2-B §1 9번(마지막 단계) 몫이다. 지금은 로그아웃 검증용
// 최소 화면만 둔다 — 로그아웃 진입점이 없으면 로그인→탭 전환의 대칭인 로그아웃→Auth
// 전환을 실기기에서 확인할 방법이 없다.
export function MyPageScreen() {
  const me = useMe();
  const logout = useLogout();

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
    <Screen scroll>
      <Spacer size="xl" />
      <Card>
        <Txt variant="h3">{me.data.nickname}</Txt>
        <Spacer size="xs" />
        <Txt variant="caption" color="mutedForeground">
          {me.data.email}
        </Txt>
      </Card>
      <Spacer size="xl" />
      <Button variant="secondary" loading={logout.isPending} onPress={() => logout.mutate()}>
        로그아웃
      </Button>
    </Screen>
  );
}
