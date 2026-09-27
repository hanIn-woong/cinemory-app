# CineMory — 내 서재 통합 + 목록 정렬 설계 스펙

> 상위 문서: `docs/M2-frontend-spec.md` — **계약과 사실은 그쪽, 실행과 검증은 여기**
> 대상: `cinemory-app` (Expo SDK 57 / RN 0.86 / Dev Client) · `cinemory-backend`
> 선행: M2-C 완료 · prebuild 전환 완료 · M3-a 구현 완료
>
> ⚠️ **§1(백엔드 계약)은 이관 대상이다.** 확정·구현 후 `cinemory-backend/docs/`의
> `controller-layer-spec.md`(5-x) · `service-layer-spec.md`(4-x)에 반영하고, 여기에는
> 포인터만 남긴다 — **백엔드 계약의 단일 출처는 백엔드 리포**(2026-09-02 확정).

---

## 0. 범위와 배경

### 0.1 ★ 이것은 기능 추가이자 버그 수정이다

정렬을 붙이려고 코드를 보다가 **내 기록 목록에 정렬이 아예 없다**는 것을 발견했다.

```java
// WatchRecordRepository — OrderBy가 없다
@EntityGraph(attributePaths = "movie")
Page<WatchRecord> findByUserIdAndRepresentativeTrue(Long userId, Pageable pageable);
```

| 목록 | 현재 정렬 | |
|---|---|---|
| 찜 | `findByUserIdOrderByIdDesc` | ✅ 이미 최근 순 |
| 컬렉션 | 없음 | ❌ **B-18**(등록됨) |
| **내 기록** | **없음** | ❌ **이번에 발견 — 미등록이었다** |

**두 가지 귀결.**

1. **"최근 기록 순"이 현재 기본값이 아니다.** 정렬이 없으니 사실상 PK 오름차순 —
   **오래된 기록이 먼저** 나온다.
2. ⚠️ **무한스크롤에서 중복·누락이 날 수 있다.** `useMyRecords`가
   `getNextPageParam: (lastPage, allPages) => allPages.length`인 **오프셋 기반**인데
   서버 정렬이 불안정하면 페이지 경계가 어긋난다. **기록 20건을 넘기 전엔 재현되지
   않아** M2-B 검증을 통과했다.

→ 이 작업은 정렬 기능을 **얹는** 동시에 그 잠복 버그를 **닫는다.**

### 0.2 단계 — 미지수를 한 시점에 몰지 않는다

| # | 단계 | 재빌드 | 산출 |
|---|---|---|---|
| **1** | 백엔드 정렬 enum + `ORDER BY` 확정 | — | **정렬 없는 페이징 버그 해소** |
| **2** | 기존 두 화면에 정렬 UI | ❌ 불필요 | **"최근 기록 순" 완료** |
| **3** | `MyLibrary` 통합(스와이프 탭) | ⚠️ **필요** | UI 개선 |
| **4** | §8.6 뒤로가기 검증표 재실행 | — | 회귀 확인 |

**진행 상황 (2026-09-26)** — **1~4단계 전부 완료.** §4.1 실기기 3·4·5번 통과, Dev Client 재빌드 후
§4.2 검증과 §8.6 검증표 통과. 이어서 마이페이지 `찜 목록` 메뉴를 없앴다(§3.3 갱신).

**2단계에서 멈춰도 요청 사항은 충족된다.** 3단계는 순수 UI라 분리해도 손해가 없고,
**네이티브 패키지가 추가되는 유일한 단계**이므로 깨지면 원인이 거기로 좁혀진다.

---

## 1. 백엔드 계약 — ✅ 이관 완료 (2026-09-26)

**단일 출처는 백엔드 리포다.** 이 절의 초안은 구현과 함께 옮겨졌다.

- 계약·근거: `cinemory-backend/docs/controller-layer-spec.md` **5-0-D-1**
- Service/Repository: `cinemory-backend/docs/service-layer-spec.md` **4-3·4-4** (2026-09-26 변경 이력)

프론트가 알아야 할 요약만 남긴다.

| 값 | 내 기록 `RecordSort` | 찜 `WishSort` |
|---|---|---|
| `RECENT` (기본값) · `OLDEST` · `TITLE` · `RELEASE_DESC` · `RELEASE_ASC` | ✅ | ✅ |
| `WATCH_DATE_DESC` · `RATING_DESC` | ✅ | ❌ (400) |

- 쿼리 파라미터 `sort`, 생략 시 `RECENT`. 타입은 `gen:api`가 리터럴 유니온으로 생성하고
  `src/types/index.ts`가 `RecordSort`·`WishSort`로 별칭한다
- nullable 컬럼(관람일·별점·개봉일)은 **방향과 무관하게 NULL이 뒤**
- ★ 초안에 없던 **`id DESC` 보조키**가 붙었다 — 동률 정렬(별점 같은 기록 여럿)에서 순서가
  전순서가 아니면 §0.1의 페이지 경계 버그가 **정렬 옵션 안에서 다시** 난다
- `Pageable`의 자유 `sort`는 서버가 버린다 — 프론트는 `sort`에 enum 값만 보낸다

## 2. 프론트 1·2단계 — 기존 화면에 정렬 붙이기

### 2.1 ★ 쿼리 키에 `sort`를 포함한다

```ts
records: {
  ofUser: (userId: number, sort: RecordSort) => ['records','ofUser',userId,sort] as const,
},
wishes: {
  ofUser: (userId: number, sort: WishSort) => ['wishes','ofUser',userId,sort] as const,
},
```

⚠️ **빠뜨리면 정렬을 바꿔도 캐시가 그대로**여서 "정렬이 안 먹는다"로 보인다.
⚠️ 무효화는 **접두사(`['records']`)로 하고 있으므로** 키가 길어져도 §3.2 매트릭스는 그대로 동작한다.

### 2.2 공용 `SortSheet`

```
SortSheet({ visible, onClose, options, value, onChange })
  options: { value: string; label: string }[]
```

- **`ActionSheet`를 재사용**한다(M2-C에서 컬렉션 수정/삭제에 쓴 것). 새 모달 인프라를 만들지 않는다
- 탭마다 **다른 옵션 배열**을 넘긴다(§1.2)
- 현재 선택값에 체크 표시 — 어떤 정렬인지 툴바 레이블로도 드러낸다(`⇅ 최근순`)

**구현 (2026-09-26)**

- `src/components/common/SortSheet.tsx` — `SortSheet` + 툴바용 `SortButton`. 체크 표시는
  `ActionSheetOption`에 **`selected?` 하나를 추가**해 해결했다(선택된 항목은 primary 색 + ✓).
  기존 호출부(컬렉션 메뉴)는 값을 안 넘기므로 영향 없음
- 옵션·레이블은 `src/constants/librarySort.ts`. 시트 순서 = 배열 순서

| 내 기록 | 찜 |
|---|---|
| 최근 기록순 · 오래된 기록순 · 최근 관람일순 · 별점 높은순 · 제목순 · 최신 개봉순 · 오래된 개봉순 | 최근 찜한순 · 먼저 찜한순 · 제목순 · 최신 개봉순 · 오래된 개봉순 |

- 툴바 좌측이 `⇅ 최근 기록순  총 N편`, 우측이 그리드/리스트 토글

### 2.3 ⚠️ 정렬 변경 = 리스트 리셋

```
정렬 변경 → 스크롤 0으로 · useCollapsibleToolbar.reset() 호출
```

**M2-B §5.5 함정 1**(`key={viewMode}` 토글 시 FlatList가 재생성되며 툴바가 숨김으로 굳는다)과
**같은 부류**다. 그때 `reset()`을 밖으로 노출해 둔 이유가 여기서 두 번째로 쓰인다.

**구현 (2026-09-26)** — 두 훅에 **`placeholderData: keepPreviousData`** 를 걸었다. 정렬을 바꾸면
쿼리 키가 바뀌어 기본 동작은 `isLoading` → **화면 전체가 `LoadingState`로 깜빡이고 툴바도
사라진다.** 이전 목록을 유지하면 FlatList가 재생성되지 않으므로 **스크롤을 직접
`scrollToOffset(0)`으로 돌려야 한다** — `changeSort`가 `setSort` → `scrollToOffset` → `reset()`을
한 번에 한다. 한 번 본 정렬로 되돌아가면 캐시가 즉시 뜬다.

정렬은 **화면 state**다(영속화 안 함, §5). 상세로 들어갔다 나와도 스택에 화면이 살아 있어 유지된다(§4.1-7).

---

## 3. 프론트 3단계 — `MyLibrary` 통합

### 3.1 왜 통합하는가 — 소셜에서 재사용된다

**3군 소셜의 "팔로잉한 사람의 서재 보기"**(§11 B-10 대안)가 요구하는 것이 정확히
**남의 기록 + 찜을 한 화면에** 보여주는 것이다. `userId`를 파라미터로 받게 만들어 두면
**그대로 소셜 화면이 된다.** 이름을 `MyLibrary`(내 서재)로 잡는 것도 그 용어와 잇기 위함이다.

### 3.2 패키지 — 네이티브 하나가 늘어난다

```
npx expo install react-native-pager-view @react-navigation/material-top-tabs
```

| | 주의 |
|---|---|
| `react-native-pager-view` | **네이티브 모듈** → ⚠️ **prebuild 재실행 + Dev Client 재빌드** |
| `@react-navigation/material-top-tabs` 7.7.2 | peer가 **`@react-navigation/native ^7.4.1`** — 현재 `7.3.4`라 **올라간다** |

⚠️ **네비게이션 코어 버전이 올라가므로 §8.6 검증표를 재빌드 후 반드시 재실행**한다.
그쪽에서 한 번 크게 데인 적이 있다(전환 중 뒤로가기 빈 화면).

**설치 결과 (2026-09-26)** — `react-native-pager-view` **8.0.2**(Expo SDK 57 지정 버전),
`@react-navigation/material-top-tabs` **7.7.2**(+`react-native-tab-view` 4.3.2),
`@react-navigation/native` **7.3.4 → 7.4.1**(`elements`도 2.9.26 → 2.9.43). `npm ls`의 peer 경고 0건.

⚠️ **prebuild는 다시 돌리지 않았다.** `android/`가 Expo autolinking(`expo-autolinking-settings`)으로
네이티브 모듈을 **Gradle 빌드 시점에** 수집하고, pager-view는 config plugin이 없어 `app.json`에서
생성될 네이티브 설정이 없다 — **재빌드만으로 링크될 것으로 본다.** ⚠️ `./gradlew assembleDebug`는 pager-view 모듈 컴파일까지 진행된 것을 봤으나 **시스템 메모리 부족으로 중단돼 완료는 미확인**이다. 재빌드에서 링크 에러가 나면 그때 prebuild를 검토한다.
Dev Client 재설치는 필요하다(JS만 바꾸면 `RNCViewPager`가 없다는 에러가 난다).

> **가로 `ScrollView pagingEnabled`로 우회하지 않는다** — 세로 무한스크롤 둘을 가로 페이저에
> 넣는 구조라 제스처가 충돌한다. 네이티브 패키지 하나가 더 싸다.

### 3.3 네비게이션 변경

```ts
// 현재
MyRecords: undefined;
Wishlist: undefined;

// 변경
MyLibrary: { initialTab?: 'records' | 'wishes' };
```

~~⚠️ **마이페이지 메뉴의 `내 기록`·`찜 목록` 두 항목은 유지한다.** 같은 라우트에 `initialTab`만
다르게 보낸다 — 메뉴를 하나로 합치면 **찜 목록으로 바로 갈 방법이 사라진다.**~~
→ **2026-09-26 뒤집음 — 마이페이지 진입점은 `내 기록` 하나.** 실기기에서 써 보니 한 번의 스와이프로
찜 탭에 닿아 별도 메뉴가 중복으로 보였다(사용자 판단). `내 기록`은 `initialTab` 없이 `MyLibrary`로
가고 기본 탭은 `records`. **`initialTab` 파라미터 자체는 남긴다** — 찜 탭으로 바로 여는 경로(3군 소셜
등)가 생기면 다시 쓴다.

⚠️ `MyPageStack`의 기존 두 라우트를 지우면 **다른 화면에서 `navigate('MyRecords')`를 부르는
곳이 깨진다.** 전수 확인 후 일괄 교체할 것.

**구현 (2026-09-26)** — 호출부는 `MyPageScreen` 메뉴 두 곳뿐이었다(딥링크 설정 없음).
`MyLibrary: { initialTab?: LibraryTab } | undefined`로 두고, 탭 파라미터 목록은
`LibraryTabParamList { records; wishes }`. 파일은 `src/screens/library/` —
`MyLibraryScreen`(탭 컨테이너 + 로그인 게이트), `RecordsTab`·`WishesTab`(기존 두 화면을 `git mv`).
탭 컴포넌트는 **`userId`를 prop으로 받는다**(§3.1 소셜 재사용 자리). 상세 이동은 탭의 navigation이
부모 스택으로 버블링되므로 `CompositeNavigationProp<MaterialTopTab…, NativeStack…>`으로 타이핑했다.

### 3.4 ★ 가장 까다로운 것 — 툴바 접기 × 가로 스와이프

```
탭 A에서 스크롤 ↓  →  툴바 숨김
   ↓ 탭 B로 스와이프
탭 B는 스크롤 0인데 툴바는 숨겨진 상태  →  되돌릴 스크롤이 없다  →  영영 안 보임
```

**M2-B §5.5 함정 3(짧은 목록)과 완전히 같은 구조**다.

→ **탭 전환 시 `reset()`을 강제한다.** 스와이프할 때마다 툴바가 나타나는 편이, 안 보이는
상태로 갇히는 것보다 낫다.

⚠️ **탭 바 자체는 접지 않는다 — 접히면 탭 전환 수단이 사라진다.**

```
┌──────────────────────┐
│  내 기록  │  찜 목록   │  ← 고정
├──────────────────────┤
│ ⇅ 최근순        ▦ ▤  │  ← 접히는 부분
└──────────────────────┘
```

**구현 (2026-09-26)** — 각 탭이 `useFocusEffect`로 포커스될 때마다 툴바를 보인다. ⚠️ **`reset()`이
아니라 새로 추가한 `show()`를 쓴다.** 탭 전환은 FlatList를 재생성하지 않아 **스크롤 위치가 유지**되는데
(§4.2-11), `reset()`은 `lastScrollY`까지 0으로 돌려 **다음 스크롤 이벤트의 delta가 현재 위치 전체**가
되고 툴바가 곧바로 다시 숨는다. `show()`는 `translateY`만 되돌린다. 탭 바는 씬 바깥에 있어 구조상 접히지 않는다.

### 3.5 ⚠️ 두 목록의 DTO가 다르다

M2-C §5.1에 이미 적어둔 것이 여기서 다시 걸린다.

| | `UserMovieListItemResponse` | `WishListItemResponse` |
|---|---|---|
| 별점 | 있다 | **없다** |
| 날짜 | — | `releaseDate`(`LocalDate` 전체) · `addedAt` |
| 장르 | — | `List<GenreResponse>` |

→ `MovieListItem`/`MovieGridItem`의 **별점 슬롯은 optional**이고 찜 탭에서는 넘기지 않는다.
`undefined`를 흘려보내면 빈 별이 그려진다.

**확인 (2026-09-26)** — 두 컴포넌트는 현재 **별점 prop 자체가 없고**, 기록 탭도 별점을 넘기지
않는다. 탭마다 렌더 코드가 따로라 섞일 경로가 없다. 기록 탭에 별점을 보이게 할 때 이 주의가 살아난다.

---

## 4. 검증

### 4.1 정렬 (1·2단계)

| # | 확인 |
|---|---|
| 1 | 내 기록 기본 진입이 **최근 기록 순**이다(이전엔 오래된 것이 먼저였다) |
| 2 | 각 정렬 옵션이 실제로 순서를 바꾼다 |
| 3 | **정렬 변경 시 스크롤이 맨 위로 가고 툴바가 보인다** |
| 4 | ⚠️ **기록 21건 이상에서 무한스크롤 — 중복·누락이 없다**(0.1의 버그 확인) |
| 5 | **날짜/별점 없는 기록이 목록 맨 위에 오지 않는다**(§1.3 NULL 위치) |
| 6 | 찜 목록도 1~3이 동일하게 동작 |
| 7 | 정렬을 바꾼 뒤 상세에 들어갔다 나와도 정렬이 유지된다 |

**4번이 핵심이다** — 이 작업의 절반은 그 버그를 닫는 것이다.

### 4.2 통합 (3단계)

| # | 확인 |
|---|---|
| 8 | 마이페이지 `내 기록` → 기록 탭, `찜 목록` → 찜 탭으로 각각 진입 |
| 9 | 좌우 스와이프로 탭이 바뀐다 |
| 10 | **탭 전환 후 툴바가 보인다**(§3.4) |
| 11 | 탭마다 **스크롤 위치가 유지**된다 |
| 12 | 탭마다 **정렬 옵션 목록이 다르다**(찜엔 별점·관람일이 없다) |
| 13 | 그리드/리스트 토글이 두 탭에 각각 적용된다 |
| 14 | **§8.6 뒤로가기 검증표 전 항목**(네비게이션 코어 버전이 올라갔다) |

---

## 5. 하지 않을 것

- **필터** — 장르·별점 범위 등. 정렬과 별개 작업이고 백엔드 계약이 더 커진다
- **컬렉션 목록 정렬** — B-18은 별건으로 둔다(같은 enum 패턴을 쓸 수 있으나 화면이 다르다)
- **검색 결과 정렬** — B-12. 백엔드가 `query`/`year`만 지원한다
- **커서 기반 페이징** — 오프셋의 근본 해법이지만 `PageResponse` 계약을 바꿔야 한다.
  정렬이 고정되면 오프셋으로도 안전하다
- **정렬 상태 영속화** — 앱을 껐다 켜도 기억하기. 지금은 화면 state로 충분하다

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-09-26 (이어서 2) | **4단계까지 완료 + 마이페이지 `찜 목록` 메뉴 삭제(§3.3 뒤집음).** Dev Client 재빌드 후 §4.2 검증과 §8.6 뒤로가기 검증표 통과를 확인받았다 — `@react-navigation/native` 7.4.1 상향의 회귀 없음. prebuild 없이 재빌드만으로 pager-view가 링크된다는 3단계의 판단도 확인됐다(이전 항목의 `assembleDebug` 중단으로 미확인이던 부분). 이어서 **§3.3의 "메뉴 두 항목 유지"를 뒤집었다** — 그 근거는 *"합치면 찜 목록으로 바로 갈 방법이 사라진다"* 였는데, 실제로는 **내 서재에서 스와이프 한 번**이라 별도 메뉴가 중복으로 보였다(사용자 판단). `내 기록` 한 항목이 `initialTab` 없이 진입한다. `initialTab`은 3군 소셜 등에서 찜 탭으로 바로 열 경로로 **남겨 뒀다** |
| 2026-09-26 (이어서) | **3단계 구현 완료 — Dev Client 재빌드·§4.2 검증 전.** §4.1은 실기기에서 3·4·5번 통과 보고를 받고 착수했다. 패키지는 §3.2대로 설치했고 `@react-navigation/native`가 7.4.1로 올라갔다. **설계와 다르게 간 것 둘** — ① **prebuild를 다시 돌리지 않았다.** Expo autolinking이 Gradle 빌드 시점에 모듈을 모으고 pager-view엔 config plugin이 없어, prebuild가 만들어 낼 차이가 없다. 되돌리기 어려운 단계를 필요 없이 밟지 않는 쪽을 택했다(`assembleDebug`는 메모리 부족으로 중단 — 네이티브 빌드 성공은 미확인). ② **탭 전환 시 `reset()`이 아니라 `show()`** — `reset()`은 viewMode 토글처럼 **스크롤이 0으로 가는 경우**를 위한 것이라, 스크롤이 유지되는 탭 전환에 쓰면 `lastScrollY`=0 때문에 다음 스크롤에서 툴바가 즉시 다시 숨는다. 로그인 게이트는 탭마다 두지 않고 `MyLibraryScreen`에서 한 번 한다. 탭 컴포넌트는 `userId` prop을 받아 §3.1의 소셜 재사용 자리를 만들어 뒀다. `npx tsc --noEmit`·`expo export android` 통과 |
| 2026-09-26 | **1·2단계 구현 완료 — §4.1 실기기 검증 전. §1을 백엔드 docs로 이관하고 포인터만 남겼다.** 백엔드(`cinemory-backend`): `RecordSort`(7)·`WishSort`(5) enum, Controller `@RequestParam(defaultValue = "RECENT")`, Service가 `PageRequest.of(page, size, enum.toSort())`로 자유 `sort`를 버림, 찜 `findByUserIdOrderByIdDesc` → `findByUserId`(메서드명 `OrderBy`는 `Pageable`의 `Sort` **앞에 덧붙어** enum 정렬을 무력화한다). ★ **초안에 없던 `id DESC` 보조키를 추가**했다 — `RATING_DESC`처럼 값이 겹치는 정렬에서 순서가 전순서가 아니면 §0.1 버그가 정렬 옵션 안에서 재발한다. NULL 뒤로는 `Sort.Order.nullsLast()`를 **Hibernate 7이 MySQL에서 에뮬레이션**해 스펙의 `(col IS NULL)` 수기 표현이 필요 없었다. `LibrarySortTest` 4건(옵션별 순서·NULL 위치·25건 3페이지 중복/누락 없음·자유 `sort` 무시) + 전체 129건 통과, 실서버에서 잘못된 값·찜의 `RATING_DESC`가 400인 것도 확인. §1.4의 `watch_record(user_id, is_representative)` 인덱스는 `idx_watch_record_user_representative`로 **존재함**. 프론트: `gen:api` diff는 `sort` 유니온 두 줄뿐, 쿼리 키에 `sort` 포함(§2.1), `SortSheet`/`SortButton` 신설 + `ActionSheetOption.selected?` 추가(§2.2), **`keepPreviousData` + 수동 `scrollToOffset(0)` + `reset()`**(§2.3 — 기본 동작이면 정렬을 바꿀 때마다 화면 전체가 로딩으로 깜빡인다). 부수 효과: **홈 배경(`useHomeBackground`)도 `sort` 없이 부르므로 서버 기본값 `RECENT`를 따라 "오래된 기록 N편" → "최근 기록 N편"으로 바뀐다** — 의도에 더 맞아 그대로 둔다. `npx tsc --noEmit`·`expo export android` 통과 |
| 2026-09-25 | **초안 작성.** 내 기록 화면 정렬 요구에서 출발했는데, 코드를 보니 **`findByUserIdAndRepresentativeTrue`에 `OrderBy`가 없어** 정렬이 기능 추가가 아니라 **버그 수정**이었다 — 최근 순이 기본값이 아닐 뿐 아니라, 오프셋 기반 무한스크롤과 겹쳐 **페이지 경계에서 중복·누락**이 날 수 있었다(B-18과 같은 계열인데 내 기록은 미등록이었다). **5-0-D(클라이언트 `sort` 미지원)와 부딪히지 않는다** — 5-0-D의 근거가 *"Repository가 정렬을 이미 고정하고 있어서"* 인데 **이 메서드는 고정하고 있지 않았다.** 자유 문자열 대신 **화이트리스트 enum 둘**(`RecordSort`·`WishSort`)로 간다 — 찜엔 `rating`·`watch_date`가 없어 **하나로 합칠 수 없다.** ⚠️ **nullable 두 개의 NULL 위치**를 뒤로 고정했다(기본값대로면 *"기억 안 나는 기록"* 이 맨 위에 온다). 조인 대상 정렬(`title`·`release_date`)은 filesort가 붙지만 **사용자 한 명 기준 수백~수천 건이라 실측 비용은 밀리초**이고, 5-0-D의 문제의식은 *"조용히 생기는 것"* 이었으므로 enum으로 그 의도는 지켜진다. **통합(`MyLibrary`)을 채택한 결정적 이유는 3군 소셜의 "팔로잉한 사람의 서재 보기"가 그대로 재사용된다는 점**이다(`userId` 파라미터화). ⚠️ 가장 까다로운 것은 **툴바 접기 × 가로 스와이프** — 탭 A에서 툴바를 숨기고 스와이프하면 탭 B는 스크롤 0이라 되돌릴 방법이 없다(**M2-B §5.5 함정 3과 동형**). 탭 전환 시 `reset()` 강제로 해결하고, **탭 바 자체는 접지 않는다**(접히면 전환 수단이 사라진다). 단계를 **4단계로 자른 것**은 3단계만 네이티브 패키지(`react-native-pager-view`)와 재빌드를 요구하고 `@react-navigation/native`가 7.3.4→7.4+로 올라가기 때문이다 — **2단계에서 멈춰도 요청 사항은 충족**되고, 깨지면 원인이 3단계로 좁혀진다. M3-a와는 `ReportRepository`가 분리돼 있어 **충돌하지 않음**을 확인했다 |
