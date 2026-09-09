# CineMory M2-C — 2군 화면 구현 스펙 (초안)

> 상위 문서: `docs/M2-frontend-spec.md` — **계약과 사실은 그쪽, 실행과 검증은 여기**
> 대상 리포: `cinemory-app` (Expo SDK 57 / RN 0.86 / React 19.2 / TypeScript)
> 화면 요구사항: 상위 §9.6~§9.8 · 게스트 우선 §6.7 · 별점 §7.3
> 선행: **M2-B 완료**(2026-09-06 실기기 검증 통과)
>
> 확정: **`Report` 분리**(§0.2) · **컬렉션 카드 = 선반 진열, B안**(§5.2, 2026-09-09).
> 미확정: §6의 백엔드 요청 3건(B-6·B-7·B-18) 전달 여부.

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
| `CollectionShelfCard` | 목록의 카드 = **선반 위 포스터 진열** + 이름 + "영화 N편" | §5.2 — 선반 색은 **반드시 토큰** |
| `CollectionFormModal` | 생성/수정 **겸용** 모달 | 초기값만 다르다. `WatchRecordModal`이 같은 패턴 |
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
```

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
- `useCollectionMovies(collectionId)` 무한스크롤
- 그리드 ↔ 리스트 토글 + 툴바 접기 (§5.1과 동일 구조)
- 헤더 `MoreVertical` → `ActionSheet` — **컬렉션 수정 / 컬렉션 삭제(destructive)**
- **삭제는 `Alert.alert` 확인 필수.** 성공 시 `['collections']` 무효화 + **`navigation.goBack()`**
  (지운 컬렉션 화면에 남아 있으면 다음 조회가 `COLLECTION_NOT_FOUND`로 터진다)
- 영화 항목 **길게 누르기** → "이 컬렉션에서 제거" (`DELETE .../movies/{movieId}`)

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

---

## 6. 백엔드 선행 — 2군에 걸리는 것

| # | 항목 | 영향 | 요청 내용 |
|---|---|---|---|
| **B-8** | **리포트 API 전체** | **`Report` 화면 전체 차단** | M3-a. 착수 전 **응답 DTO·기간 파라미터·타임존**부터 확정 |
| B-6 | 컬렉션 카드 미리보기 포스터 | **선반이 비어 있다**(§5.2 — 화면은 성립하지만 밋밋하다) | `CollectionResponse`에 `previewPosterPaths: List<String>`(최대 5, `poster_path IS NOT NULL`) 추가. §6.2 |
| B-7 | 컬렉션 단건 조회 | 딥링크 불가 · 파라미터로 우회 중 | `GET /api/collections/{id}` 추가 |
| **B-18** | **컬렉션 목록·컬렉션 영화 목록 정렬 미지정** ★신규 | **페이지 경계에서 중복·누락 가능** | `CollectionRepository.findByUserId` · `CollectionMovieRepository.findByCollectionId`에 정렬 추가 |

**B-18을 등록해야 하는 이유** — 위시(`findByUserIdOrderByIdDesc`)에는 정렬이 있는데 컬렉션
두 곳에만 없다. **일관성 문제가 아니라 정확성 문제**이며, 20개를 넘기 전에는 재현되지 않아
**사용자 데이터가 쌓인 뒤에 터진다.** 백엔드 `service-layer-spec.md`의 페이징 규약과 함께
확인하는 편이 좋다.

> 셋 다 **M2-C를 막지는 않는다.** B-8만 `Report`를 막는다.

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
| 7 | 컬렉션 **수정**(이름+설명) → **헤더 제목이 즉시 바뀐다** · 다시 열어도 **설명이 남아 있다** ★ |
| 8 | 컬렉션에서 영화 제거 → 뒤로 나가면 **카드의 "영화 N편"이 줄어 있다** ★ |
| 9 | 컬렉션 **삭제** → 목록으로 되돌아오고 카드가 사라진다 |

★ **7·8번이 실제로 자주 깨진다** — 7은 라우트 파라미터 갱신(§5.3), 8은 목록 키 무효화(§3.1).

### 7.2 경계 케이스

| # | 확인 |
|---|---|
| C-1 | 찜 0건 → `EmptyState` + 검색 CTA |
| C-2 | 컬렉션 0개 → `EmptyState` + 생성 CTA |
| C-3 | 컬렉션 0개 상태에서 상세 → **컬렉션에 추가** → 만들고 **바로 담긴다**(§5.4) |
| C-4 | 빈 컬렉션 상세 → 빈 상태가 보이고 **툴바가 사라지지 않는다**(M2-B §5.5 함정 4) |
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
- **드래그 정렬** — `CollectionMovie`에 순서 컬럼이 없다
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
| 2026-09-09 | **§1 실행 순서 1~6번 구현 완료 — 실기기 검증(§7) 전.** ① `src/api/collection.ts`에 PATCH·DELETE·영화 추가/제거 4메서드 추가(백엔드 스키마가 이미 생성돼 있어 `gen:api` 재실행 불필요, `CollectionUpdateRequest`·`AddMoviesToCollectionRequest/Response`를 `src/types/index.ts`에 별칭 추가). ② `useCollection.ts` 재작성 — `useMyCollections`·`useCollectionMovies`를 `useInfiniteQuery`로 전환, `useCreateCollection` 무효화 누락 수정, `useUpdateCollection`·`useDeleteCollection`·`useAddMoviesToCollection`·`useRemoveMovieFromCollection` 신설(영화 추가/제거는 §3.1 무효화 매트릭스대로 상세+목록 키를 함께 무효화). ③ `WishlistScreen` — `MyRecordsScreen`을 구조째 베낌. ④ `CollectionShelfCard`(선반 진열, `expo-linear-gradient`만 사용, `tokens.ts`의 `shelf` 토큰 참조, 포스터·선반 접근성 숨김) + `CollectionFormModal`(생성/수정 겸용) + `CollectionListScreen`. ⑤ `CollectionDetailScreen` — 그리드/리스트 토글+툴바 접기, 헤더 `MoreVertical` ActionSheet(수정 시 `navigation.setParams`로 헤더 제목 즉시 갱신·삭제 시 `goBack`), 영화 길게 눌러 컬렉션에서 제거. `MyPageStackParamList`·`SocialStackParamList`의 `CollectionDetail`에 `description` 추가(§5.3 (A)안). ⑥ `CollectionPickerSheet` — `MovieDetailScreen`의 `Alert.alert('준비 중', ...)`를 교체, 게스트에게도 버튼을 보이고 `useRequireAuth()`로 감쌈(G-1), `addedCount`/`skippedCount` 분기, 컬렉션 0개에서 생성 직후 바로 담기(C-3). 부수 변경 — `PosterImage`에 `radius` prop 추가(선반 카드용 3px 모서리), `MovieGridItem`/`MovieListItem`에 `onLongPress` 추가. `npx tsc --noEmit`·`expo export --platform android` 통과. **§7(검증 절차)은 실기기가 필요해 다음 세션으로 남긴다** |
| 2026-09-09 | **`Report` 분리 확정 + 컬렉션 카드를 선반 진열로 확정(B안).** ① **`Report`는 M2-C2(백엔드 M3-a 동반)로 분리**했다 — 넣어 두면 M2-C가 영원히 완료되지 않는다(§0.2). ② **컬렉션 카드 = 선반 위 포스터 진열**(§5.2). 와이어프레임의 포스터 5칸 나열을 *"서재에 DVD를 전시한 모습"* 으로 발전시킨 것으로, 3안(A 나무 · B 뉴트럴 · C 진열장)을 시안으로 비교해 **B(뉴트럴 렛지)** 를 택했다 — 흰 배경 + 시안 팔레트와 톤이 맞고 **새 색 계열을 들이지 않는다.** 구현은 전부 `expo-linear-gradient`(이미 홈 배경에서 사용 중)라 **라이브러리 추가가 없다.** 확정한 세부 넷 — ⓐ **선반 색은 반드시 토큰**(`tokens.ts`의 `shelf`): A↔B 전환을 **hex 6개 교체**로 만들기 위한 것이고, 컴포넌트에 박으면 카드·빈 상태·스켈레톤을 전부 찾아다녀야 한다. ⓑ **`shadowColor`/`elevation` 금지** — 플랫폼별로 결과가 다르고 Android는 그림자 방향을 줄 수 없어 "빛이 위에서 온다"가 성립하지 않는다. 접지 그림자는 `LinearGradient` 한 겹. ⓒ **빈 슬롯을 채우지 않는다** — 와이어프레임의 회색 사각형은 선반 위에서 **로딩 실패처럼** 보인다. ⓓ **`w92` 사용** — 홈 배경과 같은 사이즈라 **이미지 캐시가 겹친다.** ★ **이 디자인의 실질적 이점은 B-6을 기다리지 않아도 된다는 것**이다 — 빈 선반이 그 자체로 성립하므로(영화 0편 컬렉션과 같은 모습) 선반·카드를 먼저 완성하고 `previewPosterPaths`가 오면 `posters` prop만 채우면 된다. 시그니처를 처음부터 `posters?: string[]`로 열어 둔다. 함께 **§6.1에 B-6의 백엔드 구현 방향**(윈도 함수 1쿼리 — 화면 전체 2→3쿼리)을 적어 요청 비용이 작다는 근거를 남겼다 |
| 2026-09-09 | **초안 작성.** 백엔드 소스를 직접 대조해(`CollectionController` 7개 엔드포인트 · DTO 6종 · `UserAccessPolicy` · 리포지토리 정렬) 상위 §9.6~§9.8과 맞췄고, 그 과정에서 **B-18(컬렉션 목록·컬렉션 영화 목록의 정렬 미지정)** 을 새로 발견해 등록했다 — 위시만 `OrderByIdDesc`가 있고 컬렉션 두 곳에는 없어, **페이지 경계에서 중복·누락이 나는데 20개 미만에서는 재현되지 않는다.** 함께 정리한 결정 넷 — ① **`Report`를 M2-C에서 분리**(§0.2): 백엔드에 리포트 컨트롤러가 실제로 없음을 확인했고, 넣어 두면 M2-C가 영원히 완료되지 않는다. ② **`CollectionDetail` 파라미터에 `description` 추가**(§5.3): `CollectionUpdateRequest`가 전체 치환이라 설명을 모르면 **수정할 때마다 설명이 지워진다** — 치명적인데 조용한 종류다. ③ **영화 추가/제거 무효화에 목록 키를 포함**(§3.1): `movieCount`가 목록 응답에 들어 있어 상세만 무효화하면 카드 편수가 어긋난다. ④ **"토스트" → `Alert.alert`**(§5.4): 프로젝트에 토스트 인프라가 없고 M2-B 전체가 `Alert.alert`로 통일돼 있다. 기존 훅 3건의 결함(`useMyCollections`·`useCollectionMovies`의 페이지 0 고정, `useCreateCollection`의 무효화 누락)도 §3에 적었다 |
