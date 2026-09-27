import type { RecordSort, WishSort } from '../types';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

// 내 기록과 찜은 옵션 집합이 다르다 — 찜엔 관람일·별점이 없다(docs/library-sort-spec.md §1.2).
// 값은 백엔드 enum 그대로, 순서가 곧 시트 표시 순서다.
export const RECORD_SORT_OPTIONS: SortOption<RecordSort>[] = [
  { value: 'RECENT', label: '최근 기록순' },
  { value: 'OLDEST', label: '오래된 기록순' },
  { value: 'WATCH_DATE_DESC', label: '최근 관람일순' },
  { value: 'RATING_DESC', label: '별점 높은순' },
  { value: 'TITLE', label: '제목순' },
  { value: 'RELEASE_DESC', label: '최신 개봉순' },
  { value: 'RELEASE_ASC', label: '오래된 개봉순' },
];

export const WISH_SORT_OPTIONS: SortOption<WishSort>[] = [
  { value: 'RECENT', label: '최근 찜한순' },
  { value: 'OLDEST', label: '먼저 찜한순' },
  { value: 'TITLE', label: '제목순' },
  { value: 'RELEASE_DESC', label: '최신 개봉순' },
  { value: 'RELEASE_ASC', label: '오래된 개봉순' },
];
