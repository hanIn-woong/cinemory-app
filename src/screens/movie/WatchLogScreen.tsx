import { useRoute, type RouteProp } from '@react-navigation/native';
import { EmptyState, ErrorState, LoadingState } from '../../components/common';
import { Card, Screen, Spacer, Txt } from '../../components/primitives';
import { useMovieDetail } from '../../hooks/useMovies';
import { useWatchLog } from '../../hooks/useRecords';
import type { HomeStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { WatchRecordList } from './WatchRecordList';

type Rt = RouteProp<HomeStackParamList, 'WatchLog'>;

// 영화 상세의 "시청 기록 더보기" → 이 영화의 내 시청 기록 전체(2026-10-03, docs/M2B-screens-spec.md §5.4).
// 상세와 같은 WatchRecordList를 limit 없이 그린다 — 수정·대표 지정·삭제가 그대로 되고, 캐시(useWatchLog)를
// 공유하므로 여기서 바꾼 것이 돌아가면 상세에도 반영돼 있다. 새 기록 추가는 상세에서 한다.
export function WatchLogScreen() {
  const { movieId } = useRoute<Rt>().params;
  const myId = useAuthStore((s) => s.user?.id);
  const watchLog = useWatchLog(myId ?? 0, movieId);
  // 제목은 상세가 이미 받아 둔 캐시에서 — 화면 간에는 ID만 넘긴다.
  const title = useMovieDetail(movieId).data?.title;

  return (
    <Screen edges={['left', 'right']} scroll>
      {watchLog.isLoading ? (
        <LoadingState />
      ) : watchLog.isError || !watchLog.data ? (
        <ErrorState message={watchLog.error?.message} onRetry={() => watchLog.refetch()} />
      ) : watchLog.data.length === 0 ? (
        <EmptyState title="시청 기록이 없어요" />
      ) : (
        <>
          <Spacer size="md" />
          {title && <Txt variant="h4">{title}</Txt>}
          <Txt variant="caption" color="mutedForeground">
            {`${watchLog.data.length}회 시청`}
          </Txt>
          <Spacer size="sm" />
          <Card>
            <WatchRecordList movieId={movieId} records={watchLog.data} />
          </Card>
          <Spacer size="xl" />
        </>
      )}
    </Screen>
  );
}
