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
// 홈 배경은 첫인상을 결정하는 요소라 임계경로가 가장 아프다(§7.5). `poolSize`를 버킷팅해
// staleTime 안에서는 같은 쿼리 키로 캐시가 맞아떨어지게 한다. ⚠️ 반드시 올림이어야 한다 —
// 버킷이 cellsPerSet보다 작아지면 % posters.length 순환이 행 경계와 맞아떨어져 첫 행과
// 마지막 행이 통째로 중복되는 버그가 재현된다(2026-09-06 실기기 확인).
function bucketPoolSize(minCount: number): number {
  const raw = Math.min(Math.max(minCount, RECORDS_THRESHOLD), MAX_POOL);
  if (raw <= 16) return 16;
  if (raw <= 32) return 32;
  return MAX_POOL;
}

const BACKGROUND_STALE_TIME = 5 * 60 * 1000; // 배경 포스터는 30초(전역)마다 갱신될 이유가 없다

export function useHomeBackground(minCount: number): HomeBackgroundPoster[] {
  const poolSize = bucketPoolSize(minCount);
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  const userId = useAuthStore((s) => s.user?.id);

  // MyRecordsScreen의 무한스크롤(useMyRecords)과는 캐시 모양이 달라(페이징 X, size가
  // 화면마다 다름) 별도 쿼리로 뽑는다 — 첫 페이지 하나면 totalElements(임계값 판정)와
  // posterPath 전량을 한 번에 얻는다.
  const records = useQuery({
    queryKey: queryKeys.records.homeBackground(userId ?? 0, poolSize),
    queryFn: () => recordApi.ofUser(userId ?? 0, 0, poolSize),
    enabled: isAuthed,
    staleTime: BACKGROUND_STALE_TIME,
  });

  const recordCount = records.data?.totalElements ?? 0;
  const hasEnoughRecords = isAuthed && recordCount >= RECORDS_THRESHOLD;

  // records 완료를 기다리지 않고 항상 병렬로 쏜다 — 기록이 충분한 사용자에게는 permitAll·
  // 24행·53~73ms짜리 GET 하나가 낭비되지만, 그 대가로 기록 부족 사용자(신규 가입자 대부분)의
  // 임계경로에서 왕복 한 번이 사라진다. 홈 배경은 첫인상을 결정하는 요소라 이 교환이
  // 성립한다(§7.5). 어느 소스를 "고르는" 로직(반환부)은 그대로다 — 바뀐 것은 언제 쏘는가뿐.
  const random = useRandomMovies(poolSize);

  if (hasEnoughRecords) {
    return (records.data?.content ?? []).map((r) => ({ id: r.movieId!, posterPath: r.posterPath }));
  }
  return (random.data ?? []).map((m) => ({ id: m.id!, posterPath: m.posterPath }));
}
