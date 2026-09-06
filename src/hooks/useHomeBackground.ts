import { useQuery } from '@tanstack/react-query';
import { recordApi } from '../api/record';
import { useAuthStore } from '../store/authStore';
import { useRandomMovies } from './useMovies';
import { queryKeys } from './queryKeys';

const RECORDS_THRESHOLD = 12; // 미만이면 반복이 눈에 띈다(§9.1)
// 백엔드 `cinemory.movie.random.max-size`와 맞춘다 — 이보다 큰 격자는 셀당 유일한 포스터를
// 보장할 수 없다(그 이상은 극히 드문 화면 크기라 감내한다).
const MAX_POOL = 50;

export interface HomeBackgroundPoster {
  id: number;
  posterPath?: string | null;
}

// 홈 배경 그리드의 포스터 소스 — 로그인 + 기록 12편 이상이면 내 기록, 그 외(게스트·기록
// 부족·0건)는 랜덤 폴백(B-17)이다(docs/M2-frontend-spec.md §9.1, 2026-09-06 확정).
// ⚠️ 기록 0건인 신규 가입자를 반드시 폴백시켜야 한다 — 가입 직후 배경이 비면 안 된다.
//
// ⚠️ `minCount`(한 세트를 채우는 데 필요한 셀 수)만큼은 반드시 받아 온다 — 그보다 적게
// 받으면 `% posters.length` 순환이 셀 수의 약수 지점에서 정확히 한 행 단위로 다시 맞아떨어져
// **격자의 첫 행과 마지막 행이 통째로 중복 출력**된다(실기기 확인, 2026-09-06). COLUMNS=4에
// 맞춰 셀 수도 포스터 개수도 전부 4의 배수라 우연이 아니라 항상 재현되는 문제였다.
export function useHomeBackground(minCount: number): HomeBackgroundPoster[] {
  const poolSize = Math.min(Math.max(minCount, RECORDS_THRESHOLD), MAX_POOL);
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);

  // MyRecordsScreen의 무한스크롤(useMyRecords)과는 캐시 모양이 달라(페이징 X, size가
  // 화면마다 다름) 별도 쿼리로 뽑는다 — 첫 페이지 하나면 totalElements(임계값 판정)와
  // posterPath 전량을 한 번에 얻는다.
  const records = useQuery({
    queryKey: queryKeys.records.homeBackground(userId ?? 0, poolSize),
    queryFn: () => recordApi.ofUser(userId ?? 0, 0, poolSize),
    enabled: isAuthed,
  });

  const recordCount = records.data?.totalElements ?? 0;
  const hasEnoughRecords = isAuthed && recordCount >= RECORDS_THRESHOLD;

  // records 조회가 끝나 폴백이 필요하다고 확정되기 전엔 랜덤을 같이 부르지 않는다 — 게스트는
  // 처음부터 필요하지만, 로그인 사용자는 기록이 충분한지 알기 전까진 낭비 호출이라 미룬다.
  const needsRandom = !isAuthed || (records.isSuccess && !hasEnoughRecords);
  const random = useRandomMovies(poolSize, needsRandom);

  if (hasEnoughRecords) {
    return (records.data?.content ?? []).map((r) => ({ id: r.movieId!, posterPath: r.posterPath }));
  }
  return (random.data ?? []).map((m) => ({ id: m.id!, posterPath: m.posterPath }));
}
