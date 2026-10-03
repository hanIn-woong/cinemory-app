# CineMory M2-C — 2군 화면 구현 스펙 (초안)

> 상위 문서: `docs/M2-frontend-spec.md` — **계약과 사실은 그쪽, 실행과 검증은 여기**
> 대상 리포: `cinemory-app` (Expo SDK 57 / RN 0.86 / React 19.2 / TypeScript)
> 화면 요구사항: 상위 §9.6~§9.8 · 게스트 우선 §6.7 · 별점 §7.3
> 선행: **M2-B 완료**(2026-09-06 실기기 검증 통과)
>
> 확정: **`Report` 분리**(§0.2) · **컬렉션 카드 = 선반 진열, B안**(§5.2, 2026-09-09).
> 미확정: §6의 백엔드 요청 4건(B-6·B-7·B-18·B-19) 전달 여부.

---

## 0. 착수 전 — 범위를 먼저 자른다

### 0.1 M2-B가 남긴 것

M2-B에서 **의도적으로 M2-C로 미룬 것**이 하나 있다. 잊으면 상세 화면에 죽은 버튼이 남는다.

| 위치 | 현재 상태 | M2-C에서 |
|---|---|---|
| `MovieDetailScreen.tsx` `컬렉션에 추가` 버튼 | `Alert.alert('준비 중', ...)` | 컬렉션 선택 시트 연결 (§5.4) |
| `MyPageScreen` 메뉴 `내 컬렉션`·`찜 목록`·`시청 분석` | 라우트는 연결됨, 화면이 `makePlaceholder` | 앞의 둘을 실제 화면으로 (§5.1~5.3) |
| `MyPageStack`의 `Wishlist`·`CollectionList`·`CollectionDetail`·`Report` | 전부 플레이스홀더 등록 | 컴포넌트 교체 |

**이미 있는 것도 정리해 둔다** — M2-A에서 뼈대만 만들어 둔 파일이 있어 새로 만들지 않는다.

| 파일 | 상태 |
|---|---|
| `src/api/wishlist.ts` | ✅ 3개 메서드 완비 — 그대로 쓴다 |
| `src/api/collection.ts` | ⚠️ **조회 2 + 생성 1뿐.** 수정·삭제·영화 추가/제거가 없다 → §2 |
| `src/hooks/useWishlist.ts` | ✅ 완비 (`useMyWishes`는 이미 무한스크롤) |
| `src/hooks/useCollection.ts` | ⚠️ **페이지 0만 조회 + 생성 후 무효화 누락** → §3 |
| `src/api/report.ts` · `src/hooks/useReport.ts` | 빈 파일 |

### 0.2 ★ 범위 결정 — `Report`를 M2-C에서 분리한다 (확정 2026-09-09)

상위 §9.8과 §11 B-8이 말하는 그대로, **리포트 API는 존재하지 않는다.** 백엔드를 다시 확인했다
(2026-09-09) — `src/main/java/**/controller/`에 통계·캘린더·월말 리포트 컨트롤러가 **없다.**
`AdminController` 4개를 포함해 컨트롤러 16개 중 해당 도메인 자체가 없다.

**그래서 M2-C를 이렇게 자른다.**

| | 범위 | 상태 |
|---|---|---|
| **M2-C** (지금) | `Wishlist` · `CollectionList` · `CollectionDetail` · `MovieDetail` 컬렉션 연결 | ✅ API 완비 — 바로 가능 |
| **M2-C2** (백엔드 동반) | `Report`(통계·캘린더·월말) | ❌ **B-8 블로커.** 백엔드 M3-a와 같이 착수 |

**근거 셋**

1. **완료 판정이 가능해진다.** 리포트를 M2-C에 넣으면 M2-C는 백엔드 M3-a가 끝날 때까지
   영원히 "진행 중"이다. M2-B가 B-4를 자리 비움으로 우회하고 완료 판정을 낸 것과 같은 처리다.
2. **리포트는 화면이 아니라 설계 작업이 먼저다.** 기획노트 2-4에 가중치 공식·집계 쿼리가
   있으나 **엔드포인트 모양(응답 DTO·기간 파라미터·타임존)이 미정**이다. 프론트가 먼저 그리면
   반드시 두 번 만든다.
3. **차트 라이브러리 설치를 미룰 수 있다.** `react-native-gifted-charts`는 M2-C2에서 넣는다
   (M2-B §8에서 "차트 라이브러리는 2군에서 설치"로 미뤄 둔 항목 — 여기서 한 번 더 미룬다).

> ✅ **확정.** 상위 「📍 진행 현황」의 M2-C 범위에서 `Report`를 빼고 **M2-C2** 행을 신설했다.

---

## 1. 실행 순서

**뼈대가 끝까지 도는 것을 먼저 확인하고 내용을 채운다**(상위 §12 단계 공통 원칙).
아래 순서는 **의존 방향**을 따른 것이라 바꾸면 되돌아온다.

| # | 작업 | 왜 이 순서인가 |
|---|---|---|
| 1 | `src/api/collection.ts` 보강 (§2) | 훅이 없는 API를 부를 수 없다 |
| 2 | `src/hooks/useCollection.ts` 재작성 (§3) | 화면이 훅만 본다 |
| 3 | **`Wishlist` (§5.1)** | **가장 단순하다.** API·훅·무한스크롤·게이트가 이미 다 있어 **2군 파이프가 통하는지 검증하는 화면**이다 |
| 4 | `CollectionList` + 생성/수정 모달 (§5.2) | 상세로 들어가려면 목록이 먼저다 |
| 5 | `CollectionDetail` (§5.3) | 목록에서 넘긴 파라미터에 의존한다 |
| 6 | **`MovieDetail` 컬렉션 시트 (§5.4)** | **맨 마지막.** 컬렉션 목록 조회가 되어야 선택 시트를 만들 수 있다 |
| 7 | 검증 (§7) | |

---

## 2. `src/api/collection.ts` 보강

현재 조회 2 + 생성 1뿐이다. **백엔드 `CollectionController`는 7개를 노출한다** — 실제 소스로
대조한 결과다.

| 메서드 | 경로 | 응답 | 현재 |
|---|---|---|---|
| GET | `/api/users/{userId}/collections` | `PageResponse<CollectionResponse>` | ✅ |
| GET | `/api/collections/{id}/movies` | `PageResponse<CollectionMovieListItemResponse>` | ✅ |
| POST | `/api/collections` | **201** + `Location` + `CollectionResponse` | ✅ |
| **PATCH** | `/api/collections/{id}` | 200 `CollectionResponse` | ❌ 추가 |
| **DELETE** | `/api/collections/{id}` | **204** | ❌ 추가 |
| **POST** | `/api/collections/{id}/movies` | 200 `{ addedCount, skippedCount }` | ❌ 추가 |
| **DELETE** | `/api/collections/{id}/movies/{movieId}` | **204** | ❌ 추가 |

**계약 주의 4가지**

- ⚠️ **`CollectionUpdateRequest`는 `{ name, description }` 전체 치환**이다. `name`은
  `@NotBlank`라 **부분 수정으로 `name`을 생략하면 400**이다. 편집 폼은 **항상 두 필드를 다 싣는다**
  (B-15의 `PATCH /api/records`와 같은 성격 — 상위 §11.2).
- `name` max **50**, `description` max **500**. 클라이언트에서 먼저 막는다.
- `POST .../movies`는 **벌크·멱등, 최대 50**. `{ movieIds: [...] }`이며 `@NotEmpty`다.
  **1편 추가도 배열로 보낸다.**
- 컬렉션 삭제·수정은 전부 `@AuthUser(required = true)` — **게스트는 401이 아니라 진입 자체를 막는다**(§5.2).

`src/types`는 손으로 쓰지 않는다. `AddMoviesToCollectionRequest`·`AddMoviesToCollectionResponse`·
`CollectionUpdateRequest`가 이미 백엔드에 있으므로 **`npm run gen:api`로 받아 쓴다**(상위 §4).

---

## 3. `src/hooks/useCollection.ts` — 지금 것은 버리고 다시 쓴다

현재 구현에 **문제 셋**이 있다.

| # | 문제 | 결과 |
|---|---|---|
| 1 | `useMyCollections`가 `useQuery` + `page: 0` 고정 | **컬렉션이 21개를 넘으면 조용히 잘린다** |
| 2 | `useCollectionMovies`도 `page: 0` 고정 | **컬렉션에 21편 이상이면 조용히 잘린다** |
| 3 | `useCreateCollection`에 **무효화가 없다** | 생성 후 목록이 그대로다 |

1·2는 `useInfiniteQuery`로 바꾼다. **`useMyWishes`가 이미 정확한 형태**이므로 그대로 베낀다 —
`initialPageParam: 0` / `getNextPageParam: (lastPage, allPages) => lastPage.last ? undefined : allPages.length`.

> ⚠️ **`allPages.length + 1`이 아니다.** M2-B §3.3의 `+1`은 **검색 엔드포인트 하나만** 요청
> 파라미터가 1-based이기 때문이다. 컬렉션·위시는 **0-based**라 `allPages.length`가 맞다.
> 여기서 섞으면 첫 페이지를 건너뛴다.

### 3.1 무효화 매트릭스 — M2-B §3.2에 이어 붙인다

| 액션 | `invalidateQueries` 대상 |
|---|---|
| 컬렉션 생성 | `['collections']` |
| 컬렉션 수정(이름/설명) | `['collections']` |
| 컬렉션 삭제 | `['collections']` |
| **컬렉션에 영화 추가** | `['collections','movies',collectionId]` · **`['collections','ofUser',userId]`** ← ★ |
| **컬렉션에서 영화 제거** | 위와 동일 |
| 찜 토글 | `['wishes']` (M2-B에서 이미 구현) |

> ★ **영화 추가/제거에 목록 키까지 붙는 이유** — `CollectionResponse.movieCount`가
> **목록 응답에 들어 있다.** 상세에서 영화를 지우고 뒤로 나가면 카드의 "영화 N편"이 옛 값이다.
> 상세만 무효화하면 반드시 어긋난다.

### 3.2 게이팅

`useMyCollections`·`useMyWishes`는 **인증 전용**이다. `enabled: isAuthed && userId != null`을
반드시 건다(M2-B §3.4). `useCollectionMovies`는 백엔드가 permitAll이지만 **M2에서는 내 컬렉션만
들어가므로** 같이 건다.

---

## 4. 공통 부품

새로 만드는 것은 셋뿐이다. 나머지는 M2-B 것을 그대로 쓴다(`MovieGridItem` · `MovieListItem` ·
`PosterImage` · `EmptyState` · `ErrorState` · `InfiniteScrollFooter` · `ActionSheet` ·
`AuthRequired` · `useCollapsibleToolbar`).

| 컴포넌트 | 역할 | 주의 |
|---|---|---|
| `CollectionShelfCard` | 목록의 카드 = **선반 위 포스터 진열** + 이름 + "영화 N편" + 설명(있으면) | §5.2 — 선반 색은 **반드시 토큰** |
| `CollectionFormModal` | **생성 전용** 모달 | §4 — 2026-09-10부터 수정은 `CollectionEditModal`로 분리 |
| `CollectionEditModal` | 이름/설명 수정 + 영화 추가·제거 통합 편집 화면 | §5.3-A (2026-09-10 신설) |
| `CollectionPickerSheet` | 상세 화면의 "컬렉션에 추가" 선택 시트 | §5.4 |

---

## 5. 화면별 구현

> 화면의 **요구사항·레이아웃**은 상위 §9.6~§9.7에 있다. 여기에는 **구현 시 걸리는 것**만 적는다.

### 5.1 `Wishlist` — 가장 단순한 화면

- 🔒 **화면 게이트** — 게스트는 `<AuthRequired>`(상위 §6.7)
- `GET /api/users/{myId}/wishes` → `PageResponse<WishListItemResponse>`, `useMyWishes` 그대로
- 그리드(3열) ↔ 리스트 토글 + **툴바 접기** — `MyRecordsScreen`을 **구조째 베낀다**
  (`useCollapsibleToolbar` · `key={viewMode}` · `reset()` · `overflow-hidden`).
  M2-B §5.5의 **함정 4개가 그대로 재현**되므로 그 표를 다시 읽고 시작한다
- 항목 탭 → `MovieDetail`. 빈 목록 → `EmptyState` + **검색으로 보내는 CTA**

⚠️ **DTO가 `UserMovieListItemResponse`와 다르다.** `MovieListItem`을 그대로 꽂으면 안 된다.

| | `UserMovieListItemResponse` (내 기록) | `WishListItemResponse` (찜) |
|---|---|---|
| 별점 | 있다 | **없다** |
| 연도 | — | `releaseDate`(**`LocalDate` 전체**) → 연도만 뽑아 쓴다 |
| 장르 | — | `List<GenreResponse>` |
| 정렬 | — | `findByUserIdOrderByIdDesc` — **최근 찜한 것이 위** (백엔드 확정) |

→ `MovieListItem`/`MovieGridItem`의 **별점 슬롯을 optional로** 두고 찜 화면에서는 넘기지 않는다.
없는 필드를 `undefined`로 흘려보내면 빈 별이 그려진다.

### 5.2 `CollectionList`

- 🔒 게스트는 `<AuthRequired>`
- `useMyCollections(myId)` (무한스크롤로 교체된 것)
- 헤더 우측 **`컬렉션 생성`** → `CollectionFormModal`(생성 모드)
- 카드 탭 → `CollectionDetail`

#### ★ 카드 = 선반 진열 — `CollectionShelfCard` (2026-09-09 확정)

와이어프레임의 포스터 5칸 나열을 **선반 위에 세워 진열한 모습**으로 발전시킨다 — 서재에
DVD를 꽂아 둔 느낌. 채택안은 **B(뉴트럴 렛지)** 다.

**레이어 구조 — 위에서 아래로**

```
[stage]  padding 14/12/0
  └ [row]  align-items: flex-end, gap 7
      └ [poster] ×N   46 × 69 (2:3), radius 3
          ├ 접지 그림자   LinearGradient(검정→투명) · absolute · zIndex -1
          └ 광택         LinearGradient 대각선 · opacity ≤ 0.3
[shelf]
  ├ 상판  height 6  · LinearGradient 세로 3스톱 (위 밝고 아래 어둡게 = 두께로 읽힌다)
  ├ 앞면  height 3  · 상판보다 어둡게 (모서리)
  └ 밑그림자 height 10 · LinearGradient(검정 7%→투명)
[meta]   이름 ·······  영화 N편
         설명(있으면, 1줄)
```

**⚠️ 설명도 목록 카드에 표시한다(2026-09-10 실기기 피드백 — 상세에만 있어 확인할 방법이
없었다).** 이름/편수 줄 아래 `numberOfLines={1}`로 잘라 보여준다. 없으면 렌더하지 않는다.
`accessibilityLabel`도 `"{이름}, 영화 N편, {설명}"`으로 같이 갱신한다.

카드 높이 **≈ 130px**. 전부 `expo-linear-gradient`로 만든다 — **새 라이브러리를 넣지 않는다**
(홈 배경에서 이미 쓰고 있다).

**⚠️ `shadowColor`/`elevation`을 쓰지 않는다.** iOS와 Android의 결과가 다르고 Android
`elevation`은 그림자 방향을 줄 수 없어 "빛이 위에서 온다"가 성립하지 않는다. 접지 그림자는
포스터 뒤에 깐 `LinearGradient` 한 겹으로 만든다.

**⚠️ 선반 색은 반드시 `tokens.ts`에 둔다 — 하드코딩 금지**

```ts
// src/theme/tokens.ts
export const shelf = {
  boardTop: '#FFFFFF', boardMid: '#E4E6EB', boardBottom: '#D3D6DD',
  edgeTop: '#C2C6CE', edgeBottom: '#AFB4BE',
  groundShadow: 'rgba(0,0,0,0.34)',
} as const;
```

**이유는 전환 비용이다.** A(나무 선반)·C(진열장)를 검토했고 B를 택했지만, 나중에 바꿀 수 있다.
값을 토큰에 두면 **A ↔ B는 hex 6개 교체(구조 동일)** 로 끝난다. 컴포넌트에 색을 박으면
카드·빈 상태·스켈레톤을 전부 찾아다녀야 한다. (C는 카드에 배경 레이어가 하나 더 붙는
구조 변경이지만 `CollectionShelfCard` 한 파일 안에서 끝난다.)

**⚠️ 빈 슬롯을 채우지 않는다.** 와이어프레임은 5칸을 회색 사각형으로 메우는데, 선반 위에서는
그것이 **로딩 실패처럼** 보인다. 3편이면 **3장만 놓인 선반**이 정직하고 자연스럽다.

**포스터 크기는 `PosterSize.BACKDROP_TILE`(w92)** 을 쓴다. 46×69로 그리므로 2배 밀도까지
충분하고, **홈 배경과 같은 사이즈라 이미지 캐시가 겹친다** — 홈에서 스쳐 간 영화는 컬렉션
카드에서 즉시 뜬다. `LIST`(w185)를 쓰면 캐시가 갈라지고 다운로드가 두 배가 된다.

**♿ 선반과 포스터는 스크린 리더에서 숨긴다.** 카드는 *"{이름}, 영화 N편"* 하나로 읽혀야 한다.
안 숨기면 장식 이미지 5개가 그대로 읽힌다(홈 배경 4겹에서 같은 처리를 했다 — 상위 §9.1).

**성능** — 카드당 이미지 5 + 그라디언트 8~9개다. `FlatList` 가상화로 동시 마운트는 4~5장
(≈45개) 수준이라 문제없다. 스크롤이 무거워지면 **광택 레이어부터 뺀다**(가장 값싸게 버릴 수
있는 장식이다).

**★ B-6을 기다리지 않는다**

`CollectionResponse`에 포스터가 없다는 사실(§6 B-6)은 그대로다 — 실제 필드는
`{ id, name, description, movieCount, createdAt, updatedAt }`뿐이고, 그리려면 컬렉션마다
`getCollectionMovies`를 불러 **컬렉션 20개에 요청 21개(N+1)** 가 된다. 그래서 지금은 포스터를
채우지 않는다.

**그런데 이 디자인은 빈 선반이 그 자체로 성립한다** — 영화 0편인 컬렉션과 같은 모습이라
어색하지 않다. 따라서 **선반·카드를 먼저 완성해 두고**, 백엔드가 `previewPosterPaths`를
내려주면 `posters` prop만 채우면 된다. **대기 시간이 0이다.** 컴포넌트 시그니처를 처음부터
`posters?: string[]`(기본 `[]`)로 열어 둔다.

**⚠️ 정렬이 지정돼 있지 않다 — B-18 (신규 발견)**

백엔드 `CollectionRepository.findByUserId(Long, Pageable)`에 **`OrderBy`가 없다.**
`CollectionMovieRepository.findByCollectionId`도 같다. 위시(`findByUserIdOrderByIdDesc`)만
정렬이 걸려 있다.

정렬 없는 페이징은 **DB가 페이지마다 다른 순서를 줘도 규약 위반이 아니다.** 증상은
**무한스크롤에서 같은 컬렉션이 두 번 보이거나 하나가 사라지는 것**으로 나타나고,
20개 이하일 때는 재현되지 않아 **늦게 발견될수록 원인 추적이 오래 걸린다.**

- **M2-C에서는 그대로 진행한다** — 대부분의 사용자가 20개 미만이라 즉시 터지지 않는다
- **B-18로 등록해 백엔드에 `OrderByIdDesc`(또는 `createdAt DESC`) 추가를 요청**한다(§6)
- ⚠️ **클라이언트에서 정렬로 우회하지 않는다.** 페이지 안에서만 정렬해 봐야 페이지 경계의
  중복·누락은 그대로다

**생성 직후 어디에 보이는가** — 정렬이 없으므로 **새 컬렉션이 맨 위에 온다는 보장이 없다.**
생성 성공 시 `['collections']` 무효화만 하고 **"맨 위로 스크롤" 같은 동작을 넣지 않는다**
(B-18 해소 후에 넣는다).

### 5.3 `CollectionDetail`

- 헤더 제목은 **목록에서 넘긴 `title`** (상위 §8.3 — 단건 조회 API가 없다, B-7)
- `useCollectionMovies(collectionId)` — ~~무한스크롤~~ → 페이지 넘김(아래 2026-10-03)
- ~~그리드 ↔ 리스트 토글 + 툴바 접기 (§5.1과 동일 구조)~~ → **선반 진열 (2026-10-02)**: 목록 카드(§5.2)의
  "선반 위 포스터"를 그대로 이어 쌓는다 — 한 줄 = **4편**(카드는 5편), 포스터만(제목 없음, 스크린리더에는 제목을 읽힘).
  선반 그림은 `ShelfRow`로 추출해 카드와 공유한다. 마지막 줄은 덜 차도 빈 칸을 채우지 않는다(§5.2 원칙).
  리스트 토글·툴바는 제거. ~~목록 맨 위에 **벽 색 → 투명 페이드**(20dp, 스크롤 0~20에서 나타남)를 고정해
  포스터가 헤더 속으로 녹아들게 한다(헤더 = 벽 색)~~ → 아래 페이지 넘김으로 세로 스크롤이 없어져 제거
- **페이지 넘김 (2026-10-03)** — 세로 무한스크롤 대신 **가로로 넘기는 페이지**. 한 페이지 = **5열 × 4행 = 20편 =
  서버 한 페이지**(`COLLECTION_MOVIES_PAGE_SIZE`, 요청에 `size=20` 명시) — 화면 N쪽이 서버 N페이지라 다시 묶지 않는다.
  - RN `FlatList` `horizontal` + `pagingEnabled`(네이티브 모듈 없음). 받아 둔 마지막 페이지에 멈추면 다음 페이지를
    미리 받고, 아직 안 받은 다음 쪽 자리는 스피너
  - 포스터 크기 = **폭 기준(5등분)과 높이 기준(4줄 − 선반 장식 `SHELF_ROW_CHROME`) 중 작은 쪽** — 키가 작은 기기에서
    4줄이 넘치지 않게 줄인다. 줄어들면 `ShelfRow`가 포스터 묶음을 가운데에 둔다(`posterWidth` prop). 원본은 `SHELF`(w185)
  - **덜 찬 페이지도 4줄을 그린다** — 빈 줄은 선반과 벽만(사용자 결정). 포스터 칸은 채우지 않는다(§5.2 원칙)
  - 하단에 **페이지 번호** `2 / 5`(1쪽뿐이면 숨기되 자리는 유지 — 포스터 크기가 튀지 않게)
  - **페이지를 꽉 채운다** — 폭 기준으로 정해지면 4줄 아래가 비므로 남는 높이를 줄마다 나눠 **포스터 위 벽 여백**
    (`ShelfRow` `wallPaddingTop`)에 더한다. 포스터는 2:3 그대로(세로로 늘리면 그림이 잘린다). 페이지 영역과 페이지
    번호 줄도 벽 색 — 헤더부터 바닥까지 한 면, 번호는 헤더와 같은 흰 글자(`primaryForeground`)
- 헤더 `MoreVertical` → `ActionSheet` — ~~컬렉션 수정 / 컬렉션 삭제~~ → **이름·설명 수정 / 영화 편집 / 컬렉션 삭제(destructive)**
  (2026-10-02, §5.3-A 상단 참고)
- **삭제는 `Alert.alert` 확인 필수.** 성공 시 `['collections']` 무효화 + **`navigation.goBack()`**
  (지운 컬렉션 화면에 남아 있으면 다음 조회가 `COLLECTION_NOT_FOUND`로 터진다)
- 영화 항목은 **탭으로 `MovieDetail` 이동만** 한다 — 제거는 §5.3-A(컬렉션 수정 화면)로 이동
  (2026-09-10, 아래 참고)

#### 5.3-A ★ "컬렉션 수정" = 이름/설명 + 영화 추가·제거 통합 편집 (2026-09-10 실기기 피드백 반영)

> ⚠️ **2026-10-02 재구성 — 아래 9/10 통합 모달은 다시 셋으로 나뉘었다.** 현재 구성:
>
> | 진입 (상세 ⋮) | 화면 | 저장 |
> |---|---|---|
> | **이름·설명 수정** | `CollectionFormModal` 수정 모드(생성과 겸용, `editing` prop) | 모달의 `저장`에서 바로 `PATCH` |
> | **영화 편집** | 스택 화면 **`CollectionEditScreen`** (`CollectionEdit: { collectionId }`) | 헤더 `저장` 한 번에 추가 → 삭제 → 순서 |
> | └ 우측 상단 **[+]** | `CollectionAddMoviesModal` — 검색 / 내 기록 탭만 | 서버로 보내지 않고 편집 화면 리스트 **맨 위**에 대기 |
>
> - **영화 편집 화면** = 리스트(썸네일 56×84 + 제목 + 개봉연도·감독, 행 높이 100). ~~진입 시 전량 로드~~ →
>   **전량 로드는 `저장` 때**(2026-10-02 이어서 5): 진입은 상세가 받아 둔 무한스크롤 캐시로 즉시 그리고, 스크롤하면 다음
>   페이지를 이어 붙인다. 저장 시 순서를 바꿨을 때만 추가·삭제 반영 후 전량을 받아 **화면에 없는 것(= 안 받은 뒷부분)을
>   서버 순서 그대로 끝에** 붙여 보낸다 — 안 받은 영화는 서버 순서상 항상 받은 것들 뒤라 정확한 전체가 된다.
>   드래그는 받은 범위 안에서만(맨 아래로 옮기려면 끝까지 스크롤), 드래그 중에는 새 페이지를 붙이지 않는다.
>   - **순서**: 오른쪽 **≡ 핸들로만** 끈다(`Sortable.Grid` `customHandle` + `dragActivationDelay={0}`) — 행의 나머지는
>     스크롤이라 길게 누르기 방식의 "스크롤하려다 드래그" 오작동이 없다.
>   - **삭제**: 왼쪽 **⊖ 탭** 또는 **왼쪽 스와이프** → 오른쪽에 `삭제` 버튼(`ReanimatedSwipeable`, ⊖는 `openRight()`).
>     두 경로 모두 `삭제`를 한 번 더 눌러야 지워진다. 열린 행은 하나만, 드래그 시작 시 닫는다.
>   - **드래그 중인 행은 포털로**(`Sortable.PortalProvider`) — ScrollView 밖 오버레이에서 손가락 화면 좌표로 그려
>     자동 스크롤 걸음마다 튀지 않게 한다(2026-10-02 이어서 9).
>   - 저장 안 한 변경이 있으면 뒤로가기 때 묻는다(`usePreventRemove` — 9/28 모달의 "닫기 = 묻지 않고 취소"와 다르다:
>     스택 화면은 스와이프 뒤로가기로 실수로 나가기 쉽다).
>   - **진입 렌더 비용(2026-10-03)** — ① 로컬 상태(`order`·`catalog`·`serverIds`·`seenRef`)는 **첫 렌더에서** 상세 캐시로
>     초기화한다(effect로 채우면 빈 프레임 + 행 전체 재마운트). 이후 페이지만 effect가 붙인다 ② `renderItem`은
>     `useCallback`으로 고정하고 `CollectionMovieEditRow`는 `memo` — sortables는 `renderItem` identity가 바뀌면 **모든
>     행을 다시 렌더**한다(`ItemsProvider` store). 행 콜백은 id를 받는 고정 함수(`stageRemove`는 최신본 ref 경유)
>     ③ **전환 전에는 앞 10행만 그린다**(`INITIAL_ROWS`) — 나머지는 native-stack `transitionEnd`(안전망 600ms) 뒤에
>     붙인다. 상태(`order`·`serverIds`)는 처음부터 전량이고 Grid에 넘기는 범위만 자른다. 잘린 동안은 드래그와
>     다음 페이지 요청을 끈다(잘린 `onDragEnd` 데이터로 `setOrder`하면 뒷부분이 사라진다)
>     ④ 전환 뒤 나머지도 **프레임마다 10행씩**(`ROWS_PER_FRAME`, `requestAnimationFrame`) 늘린다. 새 페이지 도착도
>     같은 경로. 덜 붙은 동안은 하단에 스피너(다음 페이지 받는 중과 같은 자리).
> - ⏳ **남은 일 — `[+]`로 담은 행에 감독이 없다(2026-10-03, 경미).** 고르기 응답(검색 `MovieSummaryResponse`·
>   `MovieSearchSuggestionResponse`, 내 기록 `UserMovieListItemResponse`)에 감독이 없어 **연도만** 보인다. 저장 후
>   다시 받으면 서버 목록 응답으로 채워진다. 감독은 영화 상세(`MovieDetailResponse.directors`)에만 있다. 선택지:
>   ⓐ 고를 때 영화 상세를 받아 채움 — 담는 영화마다 요청 1회, suggestion은 sync 뒤 한 번 더 ⓑ 백엔드 검색·기록 응답에
>   `directorNames` 추가 — 다른 화면에도 쓸모 있으나 백엔드 작업. 표시용이라 저장 결과와는 무관하다.
> - ⏳ **남은 일 — 자동 스크롤 중 프레임 드랍(2026-10-02 이월, 경미).** 행을 지날 때·잡는 순간의 문제는 해결됐고
>   스크롤 중에만 남았다. 다음 순서로 좁힌다:
>   1. **배포 모드로 재현** — `npx expo start --no-dev --minify`. 개발 모드 전용이면 종료
>   2. **Perf Monitor로 UI/JS 중 어느 쪽인지** — JS면 ④, UI면 ③·⑤
>   3. **썸네일** — 비가상화 리스트라 자동 스크롤마다 새로 보이는 행의 비트맵이 GPU로 올라간다(RN Image/Fresco).
>      `SHELF`(w185) → `w92` 또는 `resizeMethod="resize"`로 픽셀 축소 시험. 화질 트레이드오프 확인
>   4. **JS 스크롤 이벤트** — 무한스크롤 판정 `onScroll`(100ms)을 `onScrollEndDrag`·`onMomentumScrollEnd`로 대체
>      (드래그 중엔 어차피 로드를 막는다)
>   5. **sortables 매 프레임 작업** — 자동 스크롤 중 `DragProvider` 반응·순서 판정이 받은 행 수에 비례하는지
>      (20행 vs 전체 비교). 비례하면 받은 행 수 상한 등 구조 대응
>   - 참고: 자동 스크롤은 (이어서 12)에서 매 프레임·비애니메이션으로 바꾼 상태. 비교 시 기본값(300ms·animated)과 대조
> - **이름·설명을 추가 모달에 붙이는 안은 기각** — `[+]`는 "영화 추가"로 읽혀 이름 수정을 찾기 어렵고, 저장 지점이
>   둘이 되어(모달에서 바로 저장하면 편집 화면 취소와 어긋남) 혼란스럽다. 편집 화면 상단 안과 비교해 **사용자가
>   메뉴 분리를 택했다.**
> - `CollectionEditModal`은 삭제. 이하 9/10 본문은 경위로만 남긴다.

최초 설계는 **길게 누르기 → 제거**였는데, 실기기 검증에서 두 가지가 지적됐다 — ①
브라우징 그리드에 표시했던 제거 버튼(X)이 **UI상 어색하다** ② 이름/설명 수정과 별개로
**영화 추가·제거도 한 곳에서 하고 싶다**(지금은 영화 상세에서 한 편씩만 담을 수 있다).
그래서 `CollectionFormModal`(생성 전용으로 축소)과 별도로 **`CollectionEditModal`**을
신설해 "컬렉션 수정" 진입점을 여기로 바꿨다.

**구성 — 전체 화면 모달**

1. 상단 — 이름/설명 `TextField` + 저장 버튼(`PATCH /api/collections/{id}`, 항상 전체 필드 전송)
2. 탭 3개
   - **현재 영화** — 3열 그리드, 각 셀 우상단에 X(`MovieGridItem`의 `onRemove`) →
     `DELETE .../movies/{movieId}`. 편집 화면 전용이라 브라우징 화면(§5.3)엔 더 이상 없다
   - **검색해서 추가** — `useMovieSearch` 재사용(`SearchResultScreen`과 같은 registered/
     suggestion 2섹션 로직). `suggestion`은 `movieId`가 없어 **`sync` 후 그 결과로 담는다**
     (검색 화면의 `handleSuggestionPress`와 동일 패턴, 다만 이동 대신 추가)
   - **내 기록에서 추가** — `useMyRecords` 재사용. 이미 시청 기록이 있는 영화라 검색보다 빠르다
3. 각 행은 담김 여부(`existingIds`, 현재 영화 목록에서 파생)에 따라 **"추가"/"담김"** 표시

**⚠️ 그리드 셀 탭이 `MovieDetail`로 이동하지 않는다.** 모달이 네비게이션 스택 위에 뜬
`<Modal>`이라, 안에서 스택을 이동하면 모달이 열린 채로 뒤에서 화면이 바뀌는 혼란만 남는다.
편집 화면에서는 포스터 탭이 아무 동작도 하지 않고 X만 제거를 수행한다.

**⚠️ 수정 모달의 초기값을 채울 방법이 지금은 없다 — 파라미터를 넓힌다**

`CollectionDetail`의 파라미터는 `{ collectionId, title }`인데 **`CollectionUpdateRequest`는
`{ name, description }` 전체 치환**이다. `description`을 모르면 **수정할 때마다 설명이 지워진다.**
치명적인데 조용하다.

두 안 중 **(A)를 채택**한다.

| | 안 | 평가 |
|---|---|---|
| **(A)** | `MyPageStackParamList`의 `CollectionDetail`을 **`{ collectionId; title; description?: string }`** 으로 넓히고 목록에서 같이 넘긴다 | ✅ 단순하고 확실하다. 파라미터 추가는 `SocialStackParamList`에도 같이 반영 |
| (B) | `['collections','ofUser',myId]` 캐시에서 `collectionId`로 찾아 쓴다 | 캐시가 비면(딥링크·복귀) 못 찾는다. **B-7이 해소되면 그때 단건 조회로 간다** |

**⚠️ 수정 성공 후 헤더 제목이 옛 이름으로 남는다.** 화면 제목이 라우트 파라미터라 캐시를
무효화해도 바뀌지 않는다. → 수정 성공 시 `navigation.setParams({ title, description })`으로
**파라미터 자체를 갱신**하고, `useLayoutEffect`로 `setOptions({ title })`을 다시 건다.

### 5.4 `MovieDetail` — 컬렉션에 추가 (M2-B에서 미룬 것)

`MovieDetailScreen.tsx`의 `Alert.alert('준비 중', ...)`를 `CollectionPickerSheet`로 교체한다.

**동작**

1. 게스트가 누르면 `useRequireAuth()` → 로그인 모달 (찜 버튼과 동일)
2. 시트에 내 컬렉션 목록 + 하단에 **`+ 새 컬렉션 만들기`**
3. 선택 → `POST /api/collections/{id}/movies` **`{ movieIds: [movieId] }`**
4. 응답 `{ addedCount, skippedCount }`로 결과를 알린다

**⚠️ 멱등이라 "이미 있음"이 에러로 오지 않는다.** 이미 담긴 영화를 다시 담으면
`addedCount: 0, skippedCount: 1`이 **200으로** 온다. 분기하지 않으면 사용자는 추가된 줄 안다.

```
addedCount === 1  →  "'{컬렉션명}'에 담았어요"
skippedCount === 1 →  "이미 '{컬렉션명}'에 있어요"
```

**⚠️ 상위 §9.7의 "토스트로 알린다"를 `Alert.alert`로 바꾼다.** 프로젝트에 토스트 인프라가
없고(`src/components/`에 없음), M2-B 전체가 `Alert.alert`로 통일돼 있다. 토스트 시스템을
지금 들이는 것은 2군 화면 셋을 위한 **범위 초과**다. 필요해지면 별도로 판단한다.

**⚠️ 컬렉션이 0개인 사용자를 막지 않는다.** 시트가 비면 `+ 새 컬렉션 만들기`만 남아야 하고,
만든 직후 **그 컬렉션에 바로 담아야** 한다(생성 응답의 `id`를 그대로 써서 이어 호출).
두 단계로 끊으면 사용자가 시트를 다시 열어야 한다.

### 5.5 `Report` — **M2-C 범위 밖** (§0.2)

`makePlaceholder('리포트', 'M3-a 미구현 — 2군')` 그대로 둔다. 착수 조건은 §6 B-8.

> ✅ **2026-09-22 — B-8이 해소돼 M2-C2가 열렸다.** 설계 확정본은 **`M2C2-report-spec.md`** 다.
> 이 절의 플레이스홀더는 그 문서의 §5.1 구현 시점에 교체된다.
>
> ✅ **2026-09-23 — 플레이스홀더 교체 완료.** `MyPageStack`의 `Report`가 `ReportScreen`으로,
> `Calendar`/`MonthlyReport` 두 화면이 신설돼 붙었다. 실기기 검증 전이다 —
> `M2C2-report-spec.md` §7을 따른다.

---

## 6. 백엔드 선행 — 2군에 걸리는 것

| # | 항목 | 영향 | 요청 내용 |
|---|---|---|---|
| **B-8** | **리포트 API 전체** | **`Report` 화면 전체 차단** | M3-a. 착수 전 **응답 DTO·기간 파라미터·타임존**부터 확정 |
| B-6 | 컬렉션 카드 미리보기 포스터 | **선반이 비어 있다**(§5.2 — 화면은 성립하지만 밋밋하다) | `CollectionResponse`에 `previewPosterPaths: List<String>`(최대 5, `poster_path IS NOT NULL`) 추가. §6.2 |
| B-7 | 컬렉션 단건 조회 | 딥링크 불가 · 파라미터로 우회 중 | `GET /api/collections/{id}` 추가 |
| **B-18** | **컬렉션 목록·컬렉션 영화 목록 정렬 미지정** ★신규 | **페이지 경계에서 중복·누락 가능** | `CollectionRepository.findByUserId` · `CollectionMovieRepository.findByCollectionId`에 정렬 추가 |
| **B-19** | **컬렉션 내 영화 순서 지정 불가** ★신규(2026-09-10) | 드래그로 영화 순서를 바꾸는 기능 요청을 받았으나 **저장할 곳이 없다** | `CollectionMovie`에 순서 컬럼(예: `position`) 추가 + `PATCH .../movies/order` 같은 저장 엔드포인트 신설 |

**B-18을 등록해야 하는 이유** — 위시(`findByUserIdOrderByIdDesc`)에는 정렬이 있는데 컬렉션
두 곳에만 없다. **일관성 문제가 아니라 정확성 문제**이며, 20개를 넘기 전에는 재현되지 않아
**사용자 데이터가 쌓인 뒤에 터진다.** 백엔드 `service-layer-spec.md`의 페이징 규약과 함께
확인하는 편이 좋다.

**B-19를 등록해야 하는 이유** — `CollectionMovie` 엔티티에 순서를 표현할 컬럼 자체가
없다(현재는 담긴 순서 = PK/생성 순서로 고정). 클라이언트에서만 순서를 바꾸면 새로고침·
재조회 시 원래 순서로 돌아가 **사용자를 속이는 UI**가 되므로, 저장 수단이 생기기 전까지
드래그 정렬 UI는 넣지 않는다(§8).

> 넷 다 **M2-C를 막지는 않는다.** B-8만 `Report`를 막고, B-19는 "순서 바꾸기" 기능
> 자체만 막는다(추가·제거는 이미 된다).

### 6.1 B-6은 백엔드에서 쿼리 1개다

이미 `movieCount`를 **벌크 그룹 카운트 1쿼리**로 처리하고 있다
(`CollectionMovieRepository.countGroupByCollectionIdIn` — 4-2의 "IN절 벌크 조회 + Service 조합"
표준 패턴). 포스터도 **같은 자리에 쿼리 하나만 더** 얹으면 된다. MySQL 8이므로 윈도 함수를 쓴다.

```sql
SELECT collection_id, poster_path FROM (
  SELECT cm.collection_id, m.poster_path,
         ROW_NUMBER() OVER (PARTITION BY cm.collection_id ORDER BY cm.id DESC) AS rn
  FROM collection_movie cm JOIN movie m ON m.id = cm.movie_id
  WHERE cm.collection_id IN (:collectionIds) AND m.poster_path IS NOT NULL
) t WHERE t.rn <= 5
```

→ **화면 전체가 2쿼리 → 3쿼리.** 클라이언트 N+1(HTTP 21회 · DB 약 100쿼리)과 비교가 되지 않는다.

⚠️ **`poster_path IS NOT NULL`을 서버에서 거르는 것이 이 요청의 핵심**이다(B-17과 같은 이유) —
클라이언트가 받은 뒤 거르면 5칸을 채우려던 것이 3칸이 된다.

⚠️ 정렬 기준(`cm.id DESC` = 최근 담은 것 먼저)은 **B-18과 함께 정한다.** 목록 정렬이 미지정인
채로 미리보기 정렬만 정하면 카드 순서와 포스터 순서의 기준이 어긋난다.

### 6.2 인터셉터 확인 — `ACCESS_DENIED`는 로그아웃 대상이 아니다

컬렉션·위시 조회는 `UserAccessPolicy.validateCanView`를 타고, 권한이 없으면 **`ACCESS_DENIED`**
가 나온다. M2-B에서 `SESSION_INVALID_CODES` 허용목록으로 바꿨으므로(M2-B 변경 이력 2026-09-05)
**이미 안전**하지만, 2군에서 처음으로 이 코드가 실제로 나올 수 있는 경로가 생긴다 —
검증(§7)에 넣어 둔다.

---

## 7. 검증 절차

### 7.1 핵심 동선 — M2-C 완료 판정

| # | 확인 |
|---|---|
| 1 | 게스트로 마이페이지 → `찜 목록`·`내 컬렉션` 탭 → **로그인 유도**가 뜬다 |
| 2 | 로그인 후 상세에서 **찜** → `찜 목록`에 **맨 위**에 뜬다 |
| 3 | 상세에서 **찜 해제** → 목록에서 사라진다 |
| 4 | `컬렉션 생성` → 목록에 나타난다 |
| 5 | 상세 화면 → **컬렉션에 추가** → 그 컬렉션 상세에 영화가 있다 |
| 6 | **같은 영화를 같은 컬렉션에 다시 추가** → *"이미 있어요"* 가 뜬다 (§5.4) |
| 7 | 컬렉션 **수정**(이름+설명, `CollectionEditModal`) → **헤더 제목이 즉시 바뀐다** · **목록 카드에도 설명이 보인다**(§5.2) · 다시 열어도 **설명이 남아 있다** ★ |
| 8 | `CollectionEditModal`의 "현재 영화" 탭에서 **X로 제거** → 뒤로 나가면 **카드의 "영화 N편"이 줄어 있다** ★ |
| 8-A | 같은 모달의 "검색해서 추가"·"내 기록에서 추가" 탭에서 영화 선택 → "현재 영화" 탭에 바로 반영, 다시 선택하면 **"담김"으로 비활성** |
| 9 | 컬렉션 **삭제** → 목록으로 되돌아오고 카드가 사라진다 |

★ **7·8번이 실제로 자주 깨진다** — 7은 라우트 파라미터 갱신(§5.3), 8은 목록 키 무효화(§3.1).

> **2026-09-10 변경** — 최초 설계(길게 누르기 → 제거)는 실기기 검증에서 브라우징 화면의
> 제거 버튼(X)이 UI상 어색하다는 지적과, 추가·제거를 한 곳에서 하고 싶다는 요청을 받아
> "컬렉션 수정" 화면(`CollectionEditModal`)으로 통합했다 — §5.3-A 참고.

### 7.2 경계 케이스

| # | 확인 |
|---|---|
| C-1 | 찜 0건 → `EmptyState` + 검색 CTA |
| C-2 | 컬렉션 0개 → `EmptyState` + 생성 CTA |
| C-3 | 컬렉션 0개 상태에서 상세 → **컬렉션에 추가** → 만들고 **바로 담긴다**(§5.4) |
| C-4 | 빈 컬렉션 상세 → 빈 상태가 보인다 (~~툴바가 사라지지 않는다~~ — 2026-10-02 툴바 제거로 해당 없음) |
| C-5 | 그리드↔리스트 토글 후 **툴바가 다시 보인다**(함정 1) |
| C-6 | 이름 51자·설명 501자 → **클라이언트에서 막힌다** |
| C-7 | 이름을 비우고 저장 → 막힌다(`@NotBlank`) |
| C-8 | 21개 이상에서 스크롤 → **다음 페이지가 온다** (⚠️ 중복이 보이면 **B-18**이다 — 프론트 버그로 오인하지 말 것) |
| C-9 | 비행기 모드에서 각 화면 → `ErrorState` + 재시도 |
| C-10 | **컬렉션 목록 스크롤이 끊기지 않는다**(카드당 그라디언트 8~9개 — §5.2) |
| C-11 | 스크린 리더로 카드를 읽으면 *"{이름}, 영화 N편"* **하나로** 읽힌다(선반·포스터가 안 읽힌다) |

### 7.3 게스트

| # | 확인 |
|---|---|
| G-1 | 게스트가 상세에서 **컬렉션에 추가** → 로그인 모달 |
| G-2 | 로그인 모달을 **취소**해도 상세 화면에 그대로 있다 |
| G-3 | 게스트 상태에서 **401이 나가지 않는다**(`enabled` 게이팅 — §3.2) |

---

## 8. 하지 않을 것 (M2-C 범위 밖)

- **`Report`·차트 라이브러리** — §0.2
- **컬렉션 공개/공유·댓글** — `TargetType.COLLECTION` 댓글 API는 있으나 **소셜(3군)** 이다
- **남의 컬렉션 보기** — API는 permitAll이지만 진입점이 소셜 화면이다(3군)
- **컬렉션 내 정렬·필터** — 백엔드 미지원(상위 B-12·5-0-D)
- **컬렉션 커버 이미지** — 필드 없음. B-6이 먼저다
- **드래그 정렬** — `CollectionMovie`에 순서 컬럼이 없다. 클라이언트만 순서를 바꿔도
  새로고침·재조회 시 원래 순서로 돌아가 사용자를 속이는 UI가 된다 → **B-19로 등록**(§6),
  백엔드에 순서 컬럼 + 저장 엔드포인트가 생긴 뒤 착수
- **토스트 시스템** — §5.4
- **선반 반사(reflection)·기울여 꽂기** — 포스터 노드가 두 배가 되고 `FlatList`에서 값이 비싸다. 필요하면 B-6 이후 별도 판단
- **위시 → 컬렉션 일괄 담기** — 벌크 API는 있으나 다중 선택 UI가 새 구조다

---

## 9. M2-D 진입 조건 (참고)

셋 다 **백엔드가 막고 있다**(상위 §11). 지금 만들면 빈 화면이 나온다.

| 화면 | 블로커 |
|---|---|
| `Social` | **B-10** — 활동 피드 API 없음 |
| `CineMap` | **B-9** — `theater` 테이블이 비어 있음 |
| `Recommend` | **B-11** — M3-b 설계 백지 |

**그리고 M2-C 도중 `expo prebuild` 분기점이 온다** — 카카오 로그인(B-1)과 지도 네이티브 SDK를
**묶어서 한 번에** 넘어간다(상위 「📍 진행 현황」 · §11.1 · §13).

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-03 (이어서 5) | **§5.3 컬렉션 상세 페이지 — 아래 빈 공간 채움 + 페이지 번호 줄을 벽 색으로.** 바로 아래 항목 실기기 확인 통과 후 사용자 피드백: 5칸이 되며 포스터가 폭 기준으로 정해져 4줄 아래가 비었다. 대안 둘 — ⓐ 남는 높이를 줄마다 나눠 **포스터 위 벽 여백**에 더함(선반 칸이 높아짐) ⓑ 포스터를 세로로 늘림(`cover`라 2:3이 깨지며 좌우가 잘림) → **ⓐ 채택**. `ShelfRow`에 `wallPaddingTop` prop(기본 12, 목록 카드는 그대로)·`SHELF_WALL_PADDING_TOP` 내보내기. 이어 사용자 요청으로 페이지 번호 줄과 페이지 영역 바탕을 `shelf.wall`로 칠했다 — 줄마다 나눈 뒤 반올림으로 남는 몇 px도 벽 색이라 티가 안 난다. 번호 글자는 청록 위 대비를 위해 `mutedForeground` → `primaryForeground`(헤더 글자와 같음). `npx tsc --noEmit` 통과, 실기기 확인 전 |
| 2026-10-03 (이어서 4) | **§5.3 컬렉션 상세 — 세로 무한스크롤 → 가로 페이지 넘김(5열 × 4행). 실기기 확인 전.** 사용자 요청(초안은 4열 × 4행). 결정 — ① **5열 × 4행 = 20편 = 서버 한 페이지**: 4×4(16편)면 서버 20편 페이지를 화면에서 다시 묶고 "한 쪽을 다 못 채운 채 다음을 받는 중" 상태를 다뤄야 한다. 5열이면 화면 N쪽 = 서버 N페이지라 그 처리가 통째로 없어진다(사용자 선택). 서버 기본값에 기대지 않게 `useCollectionMovies`가 `size=20`(`COLLECTION_MOVIES_PAGE_SIZE`)을 명시 — 편집 화면은 같은 캐시를 쓰지만 페이지 크기와 무관하게 동작한다. 5칸이 되며 원본은 `LIST`(w342) → `SHELF`(w185, 목록 카드와 같음) ② 페이지 번호 **`2 / 5`**(사용자 선택, 점은 페이지가 많으면 넘친다) ③ **덜 찬 페이지는 빈 줄을 선반·벽으로**(사용자 선택) ④ **작은 화면은 포스터 축소** — 폭 기준과 높이 기준 중 작은 값. 페이지 안 세로 스크롤은 가로 넘김과 섞여 조작이 헷갈려 배제. 구현: `FlatList` `horizontal`·`pagingEnabled`·`getItemLayout`·`windowSize={3}`(네이티브 모듈인 `react-native-pager-view`는 쓰지 않음), `onMomentumScrollEnd`에서 현재 쪽 갱신 + 받아 둔 마지막 쪽이면 다음 페이지 미리 받기, 안 받은 쪽 자리는 스피너. `ShelfRow`에 `posterWidth` prop(고정 폭 + 가운데 정렬)과 `SHELF_ROW_CHROME`·`SHELF_POSTER_GAP` 내보내기 — 목록 카드는 prop을 안 써 그대로. 세로 스크롤이 없어져 상단 페이드(10-02 이어서 3)는 제거. `npx tsc --noEmit` 통과. **실기기 확인 항목**: 넘김 감도·iOS 뒤로가기 스와이프와 첫 쪽 간섭, 작은 기기에서 4줄 맞춤, 영화 편집 후 돌아왔을 때 쪽 수 변화, 포스터 탭 → 영화 상세 → 뒤로 시 같은 쪽 유지 |
| 2026-10-03 (이어서 3) | **영화 편집 — `[+]`로 담은 행에 연도·감독이 비던 것: 연도만 채움, 감독은 남은 일로 기록.** 사용자 발견. 원인 — `CollectionAddMoviesModal`이 `onPick`에 `subtitle`을 넘기지 않았다. 세 소스(검색 등록분·검색 제안·내 기록) 모두 `releaseDate`를 가져 **연도**(`slice(0, 4)`)는 바로 채웠다. **감독은 어느 고르기 응답에도 없고** 영화 상세(`MovieDetailResponse.directors`)에만 있어, 채우려면 담을 때마다 추가 요청이나 백엔드 응답 확장이 필요하다 — "손쉬운 경우만 진행" 지시에 따라 보류하고 §5.3-A "남은 일"에 선택지와 함께 기록했다. 저장 후에는 서버 목록 응답(`releaseYear`·`directorNames`)으로 바뀌므로 표시에만 해당한다. `npx tsc --noEmit` 통과, 실기기 확인 전 |
| 2026-10-03 (이어서 2) | **영화 편집 — 전환 직후 스크롤이 멈춤: 남은 행을 프레임마다 나눠 붙임 + 하단 스피너.** 바로 아래 수정 후 실기기 보고: 전환은 빨라졌으나 전환 직후 스크롤하면 잠시 멈췄다가 리스트가 나온다. 원인 — `transitionEnd`에서 남은 행 전부를 한 커밋에 마운트했다. 스피너만 넣는 안은 기각(사용자와 합의): 같은 커밋이 UI 스레드까지 붙잡으면 스피너도 함께 멈추고 멈춤 자체가 그대로다. 수정: `rowsReady` 불리언 → `visibleCount`(초기 10), 전환 뒤 `requestAnimationFrame`마다 +10(`ROWS_PER_FRAME`) — 행이 `memo`이고 `renderItem`이 고정이라 커밋당 새 행 10개만 마운트된다. `allShown`(= `visibleCount ≥ order.length`)이 드래그·다음 페이지 요청의 조건을 대신하며, 스크롤로 받은 새 페이지도 같은 경로로 나눠 붙는다. 하단 스피너는 `isFetchingNextPage || !allShown`. 알려진 경계: 다 붙은 뒤 `[+]`로 담으면 한 프레임 동안 마지막 행이 잘리고 드래그가 꺼진다(다음 프레임에 복귀) — 무해. `npx tsc --noEmit` 통과, 실기기 확인 전 |
| 2026-10-03 (이어서) | **영화 편집 — 진입 지연 2차: 전환 전에는 앞 10행만.** 바로 아래 수정 후 실기기 보고: 로딩 시간은 크게 줄었으나 **탭 후 화면이 밀려 들어오기 전에 멈춘다.** 원인은 아래 ①의 부작용 — 행을 첫 렌더에 넣으면서 navigate 커밋이 행 N개(받은 페이지 전부) 마운트를 끝내야 전환이 시작됐다. 수정: 전환이 끝날 때까지 `Sortable.Grid`에 `order.slice(0, 10)`만 넘기고, `transitionEnd`(`closing` 아님) 또는 600ms 안전망(`ReportScreen` 차트 지연과 같은 패턴·값) 뒤에 전량을 넘긴다. 상태는 자르지 않으므로 `dirty`·저장 계산은 영향 없음. 잘린 동안은 ⓐ `sortEnabled` 끔 — `onDragEnd`의 data가 잘린 배열이라 뒷부분이 사라진다 ⓑ 무한스크롤 요청 끔 — 콘텐츠가 짧아 "끝 근처"로 오판한다. 빈 프레임은 다시 생기지 않는다(첫 10행은 첫 렌더에 있다). 검토 후 보류: ActionSheet `onDismiss` 뒤 navigate(멈춤이 시트가 아니라 마운트였음), 추가 모달 `useMyRecords` 지연(네트워크라 전환과 무관). `npx tsc --noEmit` 통과, 실기기 확인 전 |
| 2026-10-03 | **영화 편집 — 진입(⋮ → `영화 편집`)이 느림: 렌더 비용 축소. 실기기 확인 전.** 사용자 보고. 기기 계측 없이 코드로 확인한 원인 — ① 로컬 상태가 빈 배열로 시작해 `useEffect`에서 상세 캐시를 옮겨 담았다: 전환 중 빈 프레임을 그린 뒤 무거운 행(스와이프·sortables 래퍼·SVG 2·이미지) N개를 한꺼번에 마운트했고, **20편 이하면 첫 프레임에 "담긴 영화가 없어요"가 잠깐 보이는 버그**도 있었다 ② `renderItem`이 인라인이라 렌더마다 새 함수 — `react-native-sortables`의 `ItemsProvider` store는 renderer identity가 바뀌면 전 행을 재계산(`store.ts` `rendererChanged`)하므로, 진입 직후 재렌더·삭제·드래그 종료·페이지 추가 때마다 **전 행이 다시 렌더**됐다. 수정: ① `useState` 지연 초기화로 첫 렌더부터 채움(`takeFresh` 헬퍼를 초기화와 페이지 이어 붙이기가 공유) ② `renderItem` `useCallback`(deps `catalog`·`tooManyToSort`) + 행 `memo` + 행 콜백 고정(`onRemove(id)`, `stageRemove`는 ref로 최신본). 저장 로직(`serverIds`·`seenRef`·전량 로드 시점)은 그대로. 남은 후보(미적용): ActionSheet가 Modal fade-out 중에 push하는 것, 추가 모달의 `useMyRecords`가 진입 즉시 요청하는 것. 체감 비교는 dev 모드가 렌더를 수 배 느리게 하므로 `--no-dev --minify`도 함께 본다. `npx tsc --noEmit` 통과 |
| 2026-10-02 (이어서 12) | **영화 편집 — 자동 스크롤 중 프레임 드랍: 미해결, 다음 작업으로 이월.** ① (이어서 11) 이후 첫 진입 썸네일 로딩이 길어진 것은 RN Image(Fresco)와 expo-image(Glide)의 디스크 캐시가 따로라 다른 화면에서 받아 둔 포스터를 다시 받기 때문 — 이미지별 첫 1회만. 화질 문제 없음, 사용자 판단으로 수용. ② 가설 "끊김은 스크롤 박자"(Android 애니메이션 `scrollTo` 250ms 가감속 vs 300ms 간격)로 **`autoScrollInterval={0}` + `animateScrollTo={false}`**(매 프레임·비애니메이션) 적용 — 포털(이어서 9)로 #463의 떨림 원인이 사라졌다는 판단. 실기기 결과 **실제 프레임 드랍이 맞다**(사용자 확인, 시간 관계로 상세 측정 없이 이월). 설정은 그대로 두었다 — 떨림 보고는 없었다. ⚠️ 되돌릴 곳은 기본값(300ms·animated)이지 (이어서 7)의 100ms가 아니다. **→ 아래 §5.3-A "남은 일"에 다음 단계** |
| 2026-10-02 (이어서 11) | **영화 편집 — 잡는 순간 포스터가 사라졌다 나타남(깜빡). 실기기 확인 전.** 원인: `Sortable.PortalProvider`는 잡은 행을 옮기지 않고 포털에 `renderItem` 결과를 **새로 마운트**하며 원본은 같은 커밋에서 숨긴다(`ActiveItemPortal`·`DraggableView`) — 새 이미지 뷰의 첫 프레임이 비면 그대로 깜빡인다. 시도 경위: ⓐ (이어서 10)의 `PosterImage` `transition={0}`(페이드·스피너 제거) → 남음 ⓑ 보이는 행 썸네일을 `Image.loadAsync`로 미리 디코딩해 포털 복사본만 그 `ImageRef`로 그림 → **여전히 남음**: expo-image는 Android에서 source가 ref여도 Glide 파이프라인으로 비동기 부착해 첫 프레임이 빈다. **수정: 편집 행 썸네일을 expo-image(`PosterImage`) 대신 RN `Image`로**(`fadeDuration={0}`) — Android의 Fresco는 뷰가 붙을 때 디코딩된 비트맵 메모리 캐시를 **동기로** 확인해 첫 프레임에 그리고, 원본 행이 같은 URL·크기로 이미 캐시에 올려 둔다. 포스터 없음은 `PosterImage`와 같은 결정론적 그라디언트. ⓐ의 `transition` prop·ⓑ의 `editThumbCache`·`imageRef` prop은 **모두 되돌렸다**(`PosterImage` 변경 없음). ⚠️ 다른 화면의 포스터를 RN Image로 바꾸지 말 것 — 이 우회는 "같은 이미지가 새 뷰로 다시 마운트되는" 포털 전용이다 |
| 2026-10-02 (이어서 10) | **영화 편집 — 드래그 중 프레임 드랍(행을 지날 때) + 잡는 순간 포스터 튐.** 실기기 보고("다른 포스터가 흐릿해질 때 발생"). 원인: `react-native-sortables`의 `inactiveItemOpacity` 기본 **0.5** — 잡는 순간 나머지 행 전부가 300ms에 걸쳐 50%로 흐려지고 드래그 내내 반투명으로 남는다(`useItemDecoration`). Android는 반투명 뷰(이미지·텍스트·아이콘)를 오프스크린 레이어로 따로 합성하므로 흐려진 행 N개가 매 프레임 재합성됐고(받은 행이 많을수록 심함), 잡는 순간엔 N개의 페이드가 포털의 복사본 마운트와 같은 프레임에 겹쳤다. 수정: ① `inactiveItemOpacity={1}` ② 포털 복사본의 포스터 깜빡임 → `PosterImage` `transition={0}`으로 시도(효과 없음, (이어서 11)에서 RN Image로 대체하며 되돌림). 실기기 재확인 전 |
| 2026-10-02 (이어서 9) | **드래그 라이브러리 교체 시험 기각 + 자동 스크롤 중 잡은 행 튐의 실제 원인 수정.** ① `react-native-draggable-flatlist` 4.0.3을 별도 브랜치에서 시험했으나 실기기에서 **화면이 반복해서 멈춰** 브랜치째 폐기(사용자 결정). 마지막 갱신 2025-05로 reanimated 4.5·새 아키텍처 지원이 확인되지 않았고, 자동 스크롤을 `useDerivedValue` 안에서 `runOnJS → scrollToOffset`으로 일으키며 드래그 중 `scrollEnabled`를 토글하는 구조라 고치려면 라이브러리 패치를 떠안아야 한다. ⚠️ **다시 시도하지 말 것.** `react-native-sortables` 유지. ② 스와이프 메뉴에 `맨 위로`를 넣었다가 **같은 날 제거** — 삭제 메뉴에 붙어 어색하다(사용자 피드백). ③ **튐의 정확한 증상 확인**: *자동 스크롤로 아래 행이 새로 드러날 때마다 잡은 행이 위아래로 움직인다.* 원인 — 잡은 행이 ScrollView 콘텐츠 **안**에 있고 라이브러리가 스크롤 오프셋만큼 보정해 손가락 아래에 둔다. Android의 걸음마다 애니메이션 `scrollTo`가 콘텐츠와 함께 행을 먼저 옮기고 오프셋 보정(`useScrollViewOffset`)은 한두 프레임 늦어, 걸음마다 갔다가 돌아온다. (이어서 6~8)의 확대·스냅·간격·속도 조정은 이 원인을 건드리지 못했다. **수정: `Sortable.PortalProvider`로 감싼다** — 드래그 중인 행을 ScrollView 밖 오버레이로 옮겨 `touch.absoluteX/Y`(화면 좌표) 기준으로 그리므로 스크롤과 무관하다(`DragProvider`의 `activeItemAbsolutePosition` 확인). 아래 행들은 여전히 걸음 단위로 스크롤되지만 잡은 행은 손가락에 붙어 있다. ④ 자동 스크롤 속도 500은 느리다는 피드백으로 800 → 실기기에서 포털 수정 확인(잡은 행 튐 해소) 후 **1000**(라이브러리 기본값과 같음 — 처음 1000에서 튄 원인은 속도가 아니라 ③이었다). `npx tsc --noEmit` 통과, 실기기 확인 전 |
| 2026-10-02 (이어서 8) | **바로 아래 ①(자동 스크롤 간격 100ms) 되돌림 — 리스트 전체가 떨렸다.** 실기기 보고. Android에서 새 애니메이션 `scrollTo`가 이전 것을 도중에 끊어, 100ms마다 스크롤이 재시작하며 오프셋이 출렁이고 행들이 그 오프셋을 매 프레임 보정하면서 함께 떨렸다 — 라이브러리가 #463에서 300ms를 택한 이유 그대로. **간격은 기본(300ms)으로 두고 `autoScrollMaxVelocity`를 1000 → 500**으로 낮춰 한 계단 높이를 ~300px → ~150px로 줄인다. ②(맨 아래 어긋남 — 오버스크롤 0·`overScrollMode="never"`)는 유지. ⚠️ **간격을 줄이는 방향으로 다시 시도하지 말 것.** 실기기 재확인 전 |
| 2026-10-02 (이어서 7) | **영화 편집 — 드래그 자동 스크롤이 튐 + 맨 아래에서 손가락과 행이 어긋남.** 실기기 보고. 원인 둘 다 `react-native-sortables`의 Android 기본값: ① **자동 스크롤**은 Android(새 아키텍처)에서 매 프레임이 아니라 `autoScrollInterval` **300ms**마다 애니메이션 `scrollTo` 한 번 — 최고 속도(1000px/s)에서 0.3초마다 ~300px 계단. 매 프레임 방식은 라이브러리가 Fabric에서 떨린다고 피한 것(CHANGELOG #463)이라 되돌리지 않고 **간격만 100ms**(한 번에 ~100px), iOS는 기본(0) 유지 ② **맨 아래 어긋남** — 자동 스크롤이 끝에서 `autoScrollMaxOverscroll` 50px를 더 밀고, Android 12+의 stretch 오버스크롤이 콘텐츠를 시각적으로 늘리는데 터치 좌표는 그대로라 어긋난다 → `autoScrollMaxOverscroll={0}` + ScrollView `overScrollMode="never"`. 실기기 재확인 전 — 100ms도 계단이 보이면 50ms, 떨리면 150ms로 조정 |
| 2026-10-02 (이어서 6) | **영화 편집 — 드래그 시 잡은 행이 튀는 문제.** 실기기 보고(기능은 정상, 끌 때 행이 튄다). 원인은 `react-native-sortables` 기본값이 그리드 셀 기준이라 화면 폭 리스트 행에 맞지 않았던 것 — ① `activeItemScale` 1.1: 행이 좌우로 5%씩 넘친다 → **1.03** ② `enableActiveItemSnap` true: 잡는 순간 핸들 중심을 손가락 아래로 끌어와 행이 밀린다 → **false** ③ `overDrag` 'both': 리스트에서 의미 없는 가로 이탈 → **'vertical'**. 함께 ④ 드래그 상태를 state → **ref**로 — 드래그 시작 순간 화면 전체(모든 행 renderItem)가 리렌더되던 것을 없앴다. 드래그 중 도착한 페이지는 `onDragEnd`의 `setOrder`로 effect가 다시 돌며 붙는다(deps `[pages, order]`). 실기기 재확인 전 |
| 2026-10-02 (이어서 5) | **영화 편집 — 전량 로드를 진입에서 `저장` 시점으로 + 행 확대. 실기기 확인 전.** 사용자 제안. 바로 아래 항목 ②에서 "무한스크롤 연동 = 기각"으로 정리했던 두 이유를 다시 따져 보니 둘 다 막는 이유가 아니었다 — ⓐ 순서 저장의 집합 전체 요구는 **저장 때 나머지를 받아 끝에 붙이면** 충족된다(안 받은 영화는 서버 순서상 항상 받은 것 뒤) ⓑ 안 받은 위치로 못 끄는 것은 "끝까지 스크롤하면 받아진다"로 자연스럽다. 얻는 것: 진입 즉시(상세 캐시 재사용), **화면 밖 썸네일 일괄 요청 제거**(드래그 리스트는 가상화가 안 돼 전량 로드 시 500장을 한꺼번에 요청 — 실제 부담은 데이터보다 이것), 순서를 안 바꿨으면 전량 로드 자체 생략. 구현: `useCollectionMovies` 페이지를 로컬 `order`에 증분으로 붙이고(`seenRef`로 중복 방지 — 캐시 재요청·`[+]`로 고른 미수신 영화), 드래그 중에는 붙이지 않음(`dragging` 상태). 끝 근처 스크롤에서 `fetchNextPage`. 저장의 순서 단계에서 `loadAllMovies` → `[...order, ...화면에 없는 것]`. 500편 초과 판정은 첫 페이지 `totalElements`. 행: 높이 76 → 100, 썸네일 40×60 → 56×84(3배 밀도 ~170px라 `SHELF` w185 유지), 둘째 줄에 개봉연도·감독, ⊖·≡ 아이콘 확대. ⚠️ 알려진 경계: `[+]`로 고른 영화가 사실 안 받은 페이지에 이미 있던 것이면 서버는 skip하고 원래 자리에 남는다(화면엔 맨 위로 보였음) — 드묾, 데이터 손실 없음 |
| 2026-10-02 (이어서 4) | **§5.3·§5.3-A 컬렉션 편집 재구성 — 실기기 확인 전.** 사용자 요청: 편집 모달의 "현재 영화" 기능(순서·삭제)을 모달 밖으로. 결정 경위 — ① 상세 화면에서 바로 편집(선반 그리드 드래그) → 선반 판 정렬·성능 부담으로 **별도 리스트 화면**으로 ② 리스트 + 무한스크롤 연동 검토 → 순서 저장이 집합 전체를 요구하고 안 받은 위치로 끌 수 없어 **진입 시 전량 로드** 유지(최대 요청 5회) ③ 상세 페이지 넘기기 제안 → 전량 로드 부담은 편집 화면 쪽이라 해결이 안 됨을 확인, 보류 ④ 드래그는 **≡ 핸들**, 삭제는 **⊖ 탭 / 왼쪽 스와이프 → 삭제 버튼**(사용자 제안) ⑤ 이름·설명 위치 — 추가 모달 / 편집 화면 상단 / **⋮ 메뉴 분리** 중 사용자가 메뉴 분리 선택. 구현: `CollectionEditScreen`(신규 스택 화면)·`CollectionMovieEditRow`(신규)·`CollectionAddMoviesModal`(신규, 옛 모달의 검색/내 기록 탭)·`CollectionFormModal` 수정 모드 추가·`CollectionEditModal` 삭제. 상세 ⋮ = 이름·설명 수정 / 영화 편집 / 컬렉션 삭제. 새 패키지 없음(`react-native-sortables` `Sortable.Handle`, `react-native-gesture-handler/ReanimatedSwipeable`). `npx tsc --noEmit`·`expo export --platform android` 통과. **실기기 확인 항목**: 핸들 드래그와 스와이프 간섭, 세로 스크롤 중 스와이프 오작동, 끌어서 화면 끝 자동 스크롤, 삭제 후 행 당김 애니메이션, 저장 안 한 변경 시 뒤로가기 확인, 저장 후 상세·목록 카드 갱신 |
| 2026-10-02 (이어서 3) | **컬렉션 상세 — 헤더 아래 상단 페이드.** 사용자 지적: 스크롤하면 헤더와 본문 경계가 거슬린다. 원인은 헤더·벽이 같은 색인데 포스터·선반이 헤더 아래 선에서 칼로 자르듯 끊겨 그 선이 경계로 읽히는 것. 대안 넷(A 상단 페이드 · B 스크롤 시 헤더 그림자 · C blur 헤더 · D 숨김 헤더)을 비교해 **A 채택**(사용자 결정) — B는 경계를 *의도된 경계*로 만들 뿐 없애지 않고, C는 `expo-blur`가 Android 성능 문제로 마지막 수단(상위 §9.1), D는 네이티브 스택 헤더로 안 돼 커스텀 헤더가 필요하다. 구현: 리스트 위에 `pointerEvents="none"` 20dp `LinearGradient`(벽 색 → **벽 색 알파 0** — `'transparent'`는 투명 검정이라 Android에서 중간이 거무스름해진다). 맨 위에서는 첫 줄 포스터를 가리지 않게 **스크롤 0~20dp에 걸쳐 투명도 0→1**(reanimated `useAnimatedScrollHandler` — UI 스레드라 스크롤마다 리렌더 없음) |
| 2026-10-02 (이어서 2) | **컬렉션 상세 선반을 5칸 → 4칸으로.** 사용자 지시 — 상세는 포스터를 눌러 들어가는 화면이라 크게 본다. `ShelfRow`에 `slots`(기본 5)·`posterSize`(기본 `SHELF`) prop 추가, 목록 카드는 그대로 5칸. 4칸은 포스터 약 85dp → 3배 밀도에서 ~255px라 `SHELF`(w185)는 업스케일로 흐려져 **`LIST`(w342)** 를 쓴다 — 내 기록 그리드와 같은 사이즈라 이미지 캐시도 겹친다 |
| 2026-10-02 (이어서) | **선반 판을 목재 색으로 + 컬렉션 상세 헤더를 벽 색으로 — 실기기 확인 전.** 사용자 결정: ① 선반 **판**(벽·카드 바탕은 그대로)을 나무색으로 — 흰·회색 뉴트럴 판이 청록 벽 위에서 떠 보였다. `tokens.ts`의 `shelf.board*`·`edge*` 5개만 갈색 계열로 교체(9/9에 A↔B 전환을 토큰 교체로 끝내려고 만든 구조 그대로 — 컴포넌트 변경 없음), 목록 카드와 상세가 `ShelfRow`를 공유해 둘 다 바뀐다. 9/9 결정의 "새 색 계열을 들이지 않는다"는 이로써 판에 한해 철회. ② `CollectionDetail` 헤더 배경 = `shelf.wall`, 제목·뒤로가기·메뉴 아이콘 = `primaryForeground`(흰색), 헤더 하단 경계선 제거 — 벽이 헤더까지 이어진다. 화면 단위 `setOptions`라 다른 MyPage 스택 화면 헤더는 그대로 |
| 2026-10-02 | **§5.3 컬렉션 상세를 "선반 5열" 진열로 교체 — 실기기 확인 전.** 상세가 내 기록·위시와 같은 3열 그리드/리스트 구조라, 목록 카드의 "선반 위 포스터"와 이어지지 않았다(사용자 지적). 사용자 결정: **리스트 토글 제거, 포스터 아래 제목 없음.** 구현: ① 카드의 선반 그림(벽·포스터·접지 그림자·광택·선반 판)을 **`ShelfRow`로 추출**해 `CollectionShelfCard`와 상세가 공유 — 둘이 따로 어긋나지 않게. 포스터는 `onPress`가 있을 때만 `Pressable`(상세), 없으면 `View`(카드 — 카드 자체가 `Pressable`이라 안에서 터치를 가로채지 않게) ② 상세는 영화를 5개씩 묶어 `FlatList` 한 행 = 선반 한 줄. 콘텐츠 영역을 벽(`shelf.wall`)으로 칠해 선반 사이 그림자가 벽 위에 떨어지고 줄이 책장으로 읽힌다. 무한스크롤(`last`)·수정/삭제 메뉴는 그대로 ③ 툴바와 `useCollapsibleToolbar` 사용 제거(토글이 없으면 툴바에 남는 것이 없다) → C-4의 툴바 항목 해당 없음. 포스터는 약 62dp라 카드와 같은 `SHELF`(w185). **실기기 확인 항목**: 긴 컬렉션 스크롤 프레임(포스터당 그라디언트 2개 — 버벅이면 광택부터 뺀다), 목록 카드 모양 회귀 없음. `npx tsc --noEmit` 통과 |
| 2026-09-28 | **§5.3 컬렉션 편집 모달 — "현재 영화" 탭에서 순서도 편집한다.** 드래그(`react-native-sortables`)로 순서를 바꾸고 X로 빼며, 이름·설명·담기·빼기·순서가 모두 "저장" 한 번에 나간다(담기 → 빼기 → 순서). 탭은 무한스크롤이 아니라 모달을 열 때 전량 로드한다(드래그와 무한스크롤은 공존 불가). 새로 담은 영화는 목록 **맨 앞**에 보인다 — 서버(v17)가 나중에 고른 것을 맨 위에 두므로 끝에 보이던 기존 동작은 저장 후 순서와 어긋났다. 상세·경위는 `docs/collection-order-spec.md` §3.3 |
| 2026-09-27 | **선반 카드 실기기 보정 — 크기·테두리·벽(§5.2).** 미리보기 포스터(B-6)가 실제로 채워지자 셋을 고쳤다(상세 경위는 `docs/collection-order-spec.md` 변경 이력). ① **포스터가 카드 폭을 채우도록 확대** — 고정 46×69 → 선반 폭 5등분(390dp에서 ~60×90), 이미지는 `SHELF`(w185) 신설로 **ⓓ의 w92 캐시 공유를 포기**했다. ② **카드 테두리** — `card`와 `background`가 둘 다 흰색이라 경계가 없었다. ③ **포스터 뒤 "벽"** — 흰 바탕 위에 흰 선반이면 깊이가 안 읽혀 *벽 → 선반 → 바닥*의 층이 생기도록 포스터 영역만 칠했다. ②·③은 **브랜드 컬러**(사용자 요청). 첫 시도(벽 `brandLight` + 테두리 `brandDeep`)는 조합이 어색해 **테두리 `primary`(#14D9D9), 벽은 `brandDeep`(#37BEB0)**으로 확정했다(중간에 primary의 채도만 낮춘 #4DA0A0, 명도만 올린 #B9F9F9를 거쳤다) — 테두리보다 한 단계 깊은 같은 계열이라 벽이 뒤로 물러나 보인다. ⓐ 원칙대로 **`shelf.wall`·`shelf.cardBorder` 토큰으로 추가**해 컴포넌트에 색을 박지 않았다 — 톤이 맞지 않으면 이 두 값만 바꾸면 된다. ⓑ(그림자 금지)는 그대로 |
| 2026-09-10 (이어서 2) | **`CollectionDetailScreen`에서 설명 표시 제거 — 목록 카드(§5.2)와 중복.** 애초 §5.3-A 결정(위 "이어서" 항목)은 설명을 **목록 카드**에 추가하는 것이었는데, 구현 과정에서 상세 화면 제목 아래에도 같은 설명이 표시되고 있었다 — 스펙에 없던 중복. 사용자 지시로 상세 화면 쪽만 제거해 **설명은 목록에서만 보인다**로 정리했다. `description` 라우트 파라미터 자체는 그대로 유지 — `CollectionEditModal` 초기값 채우기(§5.3 "수정 모달의 초기값" 문단)에 여전히 필요하다 |
| 2026-09-10 (이어서) | **`CollectionEditModal`을 즉시 반영 → "저장" 눌러야 반영으로 전환 + 드래그 정렬 요청을 B-19로 등록.** 영화 추가/제거가 탭 즉시 서버에 반영되던 것이, 이름/설명만 "저장"을 눌러야 반영되는 것과 **동작이 갈린다**는 지적을 받았다 — 확인 결과 사용자는 **영화 변경도 저장 시점에만 반영**되길 원했다. `pendingAdd`(Map)·`pendingRemove`(Set) 로컬 상태를 도입해 화면에는 즉시 반영해 보여 주되(체감 반응성 유지), 실제 `addMovies`/`removeMovie` 호출은 `handleSave` 안에서 이름/설명 저장 다음에 한 번에 나가도록 바꿨다("닫기"는 전부 취소). 벌크 제거 엔드포인트가 없어 제거는 `Promise.all`로 한 편씩 호출한다. 같은 세션에서 뺐다가 다시 담거나(제거 대기 취소) 새로 담았다가 다시 빼면(추가 대기 취소) 헛호출 없이 상쇄되도록 처리했다. `suggestion`(미등록 영화)의 `sync`만은 예외 — 카탈로그 등록이라는 전역 동작이라 편집 취소와 무관하게 탭 즉시 실행한다. 함께, **드래그로 영화 순서를 바꾸는 기능 요청을 받았으나 `CollectionMovie`에 순서 컬럼이 없어 저장할 곳이 없다** — 클라이언트만 순서를 바꾸면 재조회 시 되돌아가 사용자를 속이는 UI가 되므로 구현하지 않고 **B-19로 등록**(§6·§8). `npx tsc --noEmit` 통과 |
| 2026-09-10 | **실기기 §7.1 검증 중 7·8번 재설계 — "컬렉션 수정"에 영화 추가·제거 통합.** ① **7번**: 이름 수정은 즉시 반영되는데 설명은 상세 화면 어디에도 안 보인다는 지적 → 목록 카드(`CollectionShelfCard`)에 설명 한 줄을 추가했다(§5.2, `accessibilityLabel`도 갱신). ② **8번**: 브라우징 그리드에 뒀던 제거용 X 버튼이 "UI상 안 좋다"는 피드백 + "추가·제거를 한 곳에서 하고 싶다"는 요청 → 브라우징 화면(§5.3)에서 제거 기능 자체를 없애고, `CollectionFormModal`을 **생성 전용**으로 되돌린 뒤 **`CollectionEditModal`**(§5.3-A)을 신설해 이름/설명 수정 + "현재 영화"(X로 제거) + "검색해서 추가"(`useMovieSearch` 재사용, suggestion은 sync 후 추가) + "내 기록에서 추가"(`useMyRecords` 재사용) 3탭을 한 모달에 묶었다. `MovieGridItem`의 `onRemove`는 이 편집 화면 전용으로 남기고 `MovieListItem`의 `onRemove`·양쪽의 `onLongPress`는 쓰는 곳이 없어져 제거했다(죽은 코드 방지). `npx tsc --noEmit`·`expo export --platform android` 통과 |
| 2026-09-09 | **§1 실행 순서 1~6번 구현 완료 — 실기기 검증(§7) 전.** ① `src/api/collection.ts`에 PATCH·DELETE·영화 추가/제거 4메서드 추가(백엔드 스키마가 이미 생성돼 있어 `gen:api` 재실행 불필요, `CollectionUpdateRequest`·`AddMoviesToCollectionRequest/Response`를 `src/types/index.ts`에 별칭 추가). ② `useCollection.ts` 재작성 — `useMyCollections`·`useCollectionMovies`를 `useInfiniteQuery`로 전환, `useCreateCollection` 무효화 누락 수정, `useUpdateCollection`·`useDeleteCollection`·`useAddMoviesToCollection`·`useRemoveMovieFromCollection` 신설(영화 추가/제거는 §3.1 무효화 매트릭스대로 상세+목록 키를 함께 무효화). ③ `WishlistScreen` — `MyRecordsScreen`을 구조째 베낌. ④ `CollectionShelfCard`(선반 진열, `expo-linear-gradient`만 사용, `tokens.ts`의 `shelf` 토큰 참조, 포스터·선반 접근성 숨김) + `CollectionFormModal`(생성/수정 겸용) + `CollectionListScreen`. ⑤ `CollectionDetailScreen` — 그리드/리스트 토글+툴바 접기, 헤더 `MoreVertical` ActionSheet(수정 시 `navigation.setParams`로 헤더 제목 즉시 갱신·삭제 시 `goBack`), 영화 길게 눌러 컬렉션에서 제거. `MyPageStackParamList`·`SocialStackParamList`의 `CollectionDetail`에 `description` 추가(§5.3 (A)안). ⑥ `CollectionPickerSheet` — `MovieDetailScreen`의 `Alert.alert('준비 중', ...)`를 교체, 게스트에게도 버튼을 보이고 `useRequireAuth()`로 감쌈(G-1), `addedCount`/`skippedCount` 분기, 컬렉션 0개에서 생성 직후 바로 담기(C-3). 부수 변경 — `PosterImage`에 `radius` prop 추가(선반 카드용 3px 모서리), `MovieGridItem`/`MovieListItem`에 `onLongPress` 추가. `npx tsc --noEmit`·`expo export --platform android` 통과. **§7(검증 절차)은 실기기가 필요해 다음 세션으로 남긴다** |
| 2026-09-09 | **`Report` 분리 확정 + 컬렉션 카드를 선반 진열로 확정(B안).** ① **`Report`는 M2-C2(백엔드 M3-a 동반)로 분리**했다 — 넣어 두면 M2-C가 영원히 완료되지 않는다(§0.2). ② **컬렉션 카드 = 선반 위 포스터 진열**(§5.2). 와이어프레임의 포스터 5칸 나열을 *"서재에 DVD를 전시한 모습"* 으로 발전시킨 것으로, 3안(A 나무 · B 뉴트럴 · C 진열장)을 시안으로 비교해 **B(뉴트럴 렛지)** 를 택했다 — 흰 배경 + 시안 팔레트와 톤이 맞고 **새 색 계열을 들이지 않는다.** 구현은 전부 `expo-linear-gradient`(이미 홈 배경에서 사용 중)라 **라이브러리 추가가 없다.** 확정한 세부 넷 — ⓐ **선반 색은 반드시 토큰**(`tokens.ts`의 `shelf`): A↔B 전환을 **hex 6개 교체**로 만들기 위한 것이고, 컴포넌트에 박으면 카드·빈 상태·스켈레톤을 전부 찾아다녀야 한다. ⓑ **`shadowColor`/`elevation` 금지** — 플랫폼별로 결과가 다르고 Android는 그림자 방향을 줄 수 없어 "빛이 위에서 온다"가 성립하지 않는다. 접지 그림자는 `LinearGradient` 한 겹. ⓒ **빈 슬롯을 채우지 않는다** — 와이어프레임의 회색 사각형은 선반 위에서 **로딩 실패처럼** 보인다. ⓓ **`w92` 사용** — 홈 배경과 같은 사이즈라 **이미지 캐시가 겹친다.** ★ **이 디자인의 실질적 이점은 B-6을 기다리지 않아도 된다는 것**이다 — 빈 선반이 그 자체로 성립하므로(영화 0편 컬렉션과 같은 모습) 선반·카드를 먼저 완성하고 `previewPosterPaths`가 오면 `posters` prop만 채우면 된다. 시그니처를 처음부터 `posters?: string[]`로 열어 둔다. 함께 **§6.1에 B-6의 백엔드 구현 방향**(윈도 함수 1쿼리 — 화면 전체 2→3쿼리)을 적어 요청 비용이 작다는 근거를 남겼다 |
| 2026-09-09 | **초안 작성.** 백엔드 소스를 직접 대조해(`CollectionController` 7개 엔드포인트 · DTO 6종 · `UserAccessPolicy` · 리포지토리 정렬) 상위 §9.6~§9.8과 맞췄고, 그 과정에서 **B-18(컬렉션 목록·컬렉션 영화 목록의 정렬 미지정)** 을 새로 발견해 등록했다 — 위시만 `OrderByIdDesc`가 있고 컬렉션 두 곳에는 없어, **페이지 경계에서 중복·누락이 나는데 20개 미만에서는 재현되지 않는다.** 함께 정리한 결정 넷 — ① **`Report`를 M2-C에서 분리**(§0.2): 백엔드에 리포트 컨트롤러가 실제로 없음을 확인했고, 넣어 두면 M2-C가 영원히 완료되지 않는다. ② **`CollectionDetail` 파라미터에 `description` 추가**(§5.3): `CollectionUpdateRequest`가 전체 치환이라 설명을 모르면 **수정할 때마다 설명이 지워진다** — 치명적인데 조용한 종류다. ③ **영화 추가/제거 무효화에 목록 키를 포함**(§3.1): `movieCount`가 목록 응답에 들어 있어 상세만 무효화하면 카드 편수가 어긋난다. ④ **"토스트" → `Alert.alert`**(§5.4): 프로젝트에 토스트 인프라가 없고 M2-B 전체가 `Alert.alert`로 통일돼 있다. 기존 훅 3건의 결함(`useMyCollections`·`useCollectionMovies`의 페이지 0 고정, `useCreateCollection`의 무효화 누락)도 §3에 적었다 |
