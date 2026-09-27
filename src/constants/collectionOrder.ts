// 순서 저장 상한 — 서버 @Size(CollectionOrderRequest 200 / CollectionMovieOrderRequest 500)와
// 같은 값이어야 한다. 넘으면 400이고 부분 저장이 없으므로 편집 진입 자체를 막는다
// (docs/collection-order-spec.md §1·§3.2).
export const COLLECTION_ORDER_MAX = 200;
export const COLLECTION_MOVIE_ORDER_MAX = 500;

// 전량 로드의 페이지 크기. ⚠️ 스펙 초안의 size=200/500 한 번 요청은 불가능하다 — 서버의
// spring.data.web.pageable.max-page-size = 100(백엔드 5-0-D)이 조용히 100으로 잘라서, 잘린
// 배열을 저장하면 집합 불일치 400이 난다. 100씩 last까지 이어 받는다(2026-09-27 실측).
export const FULL_LOAD_PAGE_SIZE = 100;
