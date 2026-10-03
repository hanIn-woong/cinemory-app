import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { recordApi } from '../api/record';
import type { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type {
  CreateRecordRequest,
  PageResponse,
  RecordSort,
  UpdateRecordRequest,
  UserMovieListItemResponse,
  WatchRecordResponse,
} from '../types';
import { queryKeys } from './queryKeys';

// ⚠️ UseInfiniteQueryResult의 TData는 InfiniteData<T>로 감싼 형태다 — 원본 응답 타입을
// 그대로 넣으면 .data.pages가 타입에 잡히지 않는다.
export function useMyRecords(
  userId: number,
  sort: RecordSort = 'RECENT',
): UseInfiniteQueryResult<InfiniteData<PageResponse<UserMovieListItemResponse>>, ApiError> {
  // 인증 전용 화면 — enabled 게이팅 필수(docs/M2B-screens-spec.md §3.4). 빠져 있으면
  // 게스트가 이 훅을 쓰는 화면에 들어오는 것만으로 불필요한 401 요청이 나간다.
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useInfiniteQuery({
    queryKey: queryKeys.records.ofUser(userId, sort),
    queryFn: ({ pageParam }) => recordApi.ofUser(userId, pageParam, undefined, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.last ? undefined : allPages.length),
    enabled: isAuthed,
    // 정렬을 바꾸면 키가 바뀐다 — 새 정렬이 올 때까지 이전 목록을 유지해 화면 전체가
    // 로딩으로 깜빡이지 않게 한다(스크롤·툴바 리셋은 화면 몫, docs/library-sort-spec.md §2.3).
    placeholderData: keepPreviousData,
  });
}

// "N편 관람" — UserProfileResponse에 watchedCount가 없어 size=1 조회의 totalElements로 얻는다
// (docs/M2B-screens-spec.md §5.6).
export function useMyRecordsCount(userId: number): UseQueryResult<number, ApiError> {
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.records.count(userId),
    queryFn: () => recordApi.ofUser(userId, 0, 1).then((p) => p.totalElements),
    enabled: isAuthed,
  });
}

export function useWatchLog(userId: number, movieId: number): UseQueryResult<WatchRecordResponse[], ApiError> {
  // GET .../records/movies/{movieId} — 회차 목록. 페이징 없는 배열 응답.
  // 로그인 의존 훅 — 비로그인 진입 시 401을 내지 않도록 막는다 (§3.4).
  const isAuthed = useAuthStore((s) => s.status === 'authenticated');
  return useQuery({
    queryKey: queryKeys.records.ofUserMovie(userId, movieId),
    queryFn: () => recordApi.ofUserMovie(userId, movieId),
    enabled: isAuthed,
  });
}

export function useCreateRecord(): UseMutationResult<void, ApiError, CreateRecordRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => recordApi.create(body).then(() => undefined),
    onSuccess: (_data, variables) => {
      // 시청 기록 생성 → ['records'] · ['movies','detail',movieId] · ['report'] 무효화
      // (§3.2 무효화 매트릭스, docs/M2C2-report-spec.md §3.3)
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(variables.movieId) });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      // 서버가 같은 영화의 찜을 함께 지운다(2026-10-03, 백엔드 service-layer-spec 4-3) — 찜 목록과 영화 상세의
      // 찜 아이콘(wishes.me)이 옛 상태로 남지 않게 한다. 사용자에게 따로 알리지 않는다(조용히 빠짐).
      queryClient.invalidateQueries({ queryKey: ['wishes'] });
    },
  });
}

interface UpdateRecordVars {
  recordId: number;
  movieId: number;
  body: UpdateRecordRequest;
}

export function useUpdateRecord(): UseMutationResult<WatchRecordResponse, ApiError, UpdateRecordVars> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, body }) => recordApi.update(recordId, body),
    onSuccess: (_data, { movieId }) => {
      // 시청 기록 수정 → ['records'] · ['movies','detail',movieId] · ['reviews'] · ['report']
      // 무효화 (§3.2). 대표 기록의 rating을 고치면 공개 리뷰에 표시되는 별점도 파생돼서
      // 바뀐다(§7.3) — 리뷰 쪽을 안 지우면 화면에 옛 별점이 남는다. ['report']는
      // docs/M2C2-report-spec.md §3.3 — 편수·시간·별점 분포 등이 이 기록에 얽혀 있다.
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(movieId) });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
  });
}

export function useDeleteRecord(): UseMutationResult<void, ApiError, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId) => recordApi.remove(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      // docs/M2C2-report-spec.md §3.3
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
  });
}

interface SetRepresentativeVars {
  recordId: number;
  userId: number;
  movieId: number;
}

export function useSetRepresentative(): UseMutationResult<void, ApiError, SetRepresentativeVars> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId }) => recordApi.setRepresentative(recordId),
    onSuccess: (_data, { userId, movieId }) => {
      // 대표 기록 변경 → ['records','ofUserMovie',userId,movieId] · ['report'] 무효화
      // (§3.2 무효화 매트릭스, docs/M2C2-report-spec.md §3.3)
      queryClient.invalidateQueries({ queryKey: queryKeys.records.ofUserMovie(userId, movieId) });
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
  });
}
