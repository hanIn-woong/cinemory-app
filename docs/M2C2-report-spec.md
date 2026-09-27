# M2-C2 — 시청 분석 리포트 화면 설계 (확정 2026-09-22)

> **M2-C에서 분리해 둔 `Report`를 여기서 닫는다**(`M2C-screens-spec.md` §0.2).
> 착수를 막고 있던 **B-8(백엔드 M3-a 미구현)이 해소**됐다.
>
> **백엔드 계약의 단일 출처는 백엔드 리포다.** 응답 DTO·집계 규칙·쿼리는
> `cinemory-backend/docs/M3a-report-spec.md`(설계 근거) · `controller-layer-spec.md` 5-8(엔드포인트) ·
> `service-layer-spec.md` 4-8(집계)에 있다. **이 문서는 화면이 그 계약을 어떻게 쓰는지만 정한다.**

## 0. 착수 전

### 0.1 전제 — 이미 끝난 것

| 항목 | 상태 |
|---|---|
| 백엔드 M3-a (`/report/statistics` · `/monthly` · `/calendar`) | ✅ 구현 완료 |
| 화이트리스트 `GET /api/users/*/report/**` | ✅ 등록 확인 (`/**` 포함) |
| B-13(OTT 플랫폼 목록) | ✅ `GET /api/ott-platforms` |
| B-20(`note` → `privateReview`) | ✅ 프론트 반영 + `gen:api` 재생성 완료 |
| `MyPageScreen`의 `시청 분석` 메뉴 | ✅ 이미 존재 (`nav.navigate('Report')`) |

### 0.2 아직 없는 것

- **`react-native-gifted-charts` 미설치.** M2-B §8 → M2-C §0.2로 두 번 미룬 항목이며 **여기서 넣는다.**
- `src/api/report.ts` · `src/hooks/useReport.ts` — **빈 파일**(골격만 있음)
- `src/screens/report/` — **빈 폴더**
- `queryKeys`에 `report` 없음
- `endpoints.ts`에 `report` 없음
- **캘린더 화면 자체가 없다** — 마이페이지 요약 위젯과 상세 둘 다 신규

### 0.3 범위 — 화면 셋 + 위젯 하나

| 화면 | 진입 | API |
|---|---|---|
| `Report` (시청 분석) | **마이페이지 메뉴** | `GET /report/statistics` |
| `Calendar` | **마이페이지 요약 위젯 탭** | `GET /report/calendar?year=&month=` |
| `MonthlyReport` (월말) | **캘린더 화면에서 진입** | `GET /report/monthly?year=&month=` |
| `CalendarSummary` 위젯 | 마이페이지에 상주 | 위와 같은 캘린더 쿼리 재사용 |

⚠️ **연말 리포트는 만들지 않는다 (2026-09-22 확정, A안).**
백엔드에 `/report/yearly`가 없고, `M3a-report-spec.md` 8절이 *"연말 결산은 이 단계에서 하지 않는다 —
월말이 돌면 기간만 넓히면 된다"* 로 이미 확정해 뒀다. `monthlyTrend`로 프론트에서 연 단위 집계를
흉내내는 안(C)도 검토했으나 **얻는 것이 `watchCount`·`movieCount`·`watchedMinutes` 셋뿐**이라
연말에 보고 싶은 *"올해의 감독·장르"* 가 나오지 않는다. 반쪽 화면을 만드는 대신 **열지 않는다.**

---

## 1. 실행 순서

| # | 작업 | 산출 | 검증 지점 |
|---|---|---|---|
| 1 | `react-native-gifted-charts` 설치 (§4.1) | | **빌드 통과 확인이 먼저** |
| 2 | `endpoints.ts` + `src/api/report.ts` (§2) | API 3종 | |
| 3 | `types/index.ts` 별칭 (§2.3) | | `gen:api` 스키마명 그대로 |
| 4 | `queryKeys.report` + `useReport.ts` (§3) | 훅 3종 | |
| 5 | **무효화 매트릭스 반영 (§3.3)** ★ | 기존 훅 수정 | **기록·리뷰 변경 후 통계가 갱신되는지** |
| 6 | 공통 부품 (§4.2) | `SectionCard` · `StatTile` · 차트 래퍼 | |
| 7 | **`Report` 화면** (§5.1) ★★ | 10개 섹션 | 한 화면 스크롤 |
| 8 | `Calendar` 화면 (§5.2) | 월 이동 | **다음 달로 넘어가도 400이 아니다** |
| 9 | `MonthlyReport` (§5.3) | | 캘린더에서 진입 |
| 10 | 마이페이지 캘린더 요약 위젯 (§5.4) | `compact` | |
| 11 | 검증 (§7) | | |

> **5번을 화면보다 먼저 하는 이유** — 무효화를 나중에 붙이면 *"기록을 남겼는데 통계가 그대로"* 를
> 화면 버그로 오해하고 엉뚱한 곳을 디버깅하게 된다.

---

## 2. API 레이어

### 2.1 `endpoints.ts` 추가분

```ts
report: {
  statistics: (userId: number) => `/api/users/${userId}/report/statistics`,
  monthly:    (userId: number) => `/api/users/${userId}/report/monthly`,
  calendar:   (userId: number) => `/api/users/${userId}/report/calendar`,
},
```

### 2.2 `src/api/report.ts`

```ts
export const reportApi = {
  statistics: (userId: number) =>
    api.get<ReportStatisticsResponse>(EP.report.statistics(userId)).then((r) => r.data),

  // ⚠️ year/month는 필수다. 서버가 기본값을 두지 않는다 — 기본값을 서버가 정하면
  //    서버 타임존이 개입하기 때문이다(M3a RA-2). 호출부가 항상 명시한다.
  monthly: (userId: number, year: number, month: number) =>
    api.get<ReportMonthlyResponse>(EP.report.monthly(userId), { params: { year, month } }).then((r) => r.data),

  calendar: (userId: number, year: number, month: number) =>
    api.get<ReportCalendarResponse>(EP.report.calendar(userId), { params: { year, month } }).then((r) => r.data),
};
```

⚠️ **`PageResponse`로 감싸지 않는다.** TOP N은 페이징이 아니며 서버도 `PageResponse`를 쓰지 않는다
(5-8-C). `size` 파라미터도 없다 — 개수는 서버 상수다.

### 2.3 `types/index.ts` 별칭

`gen:api` 생성 스키마명을 그대로 쓴다(M2-A §11 — **DTO를 추측하면 반드시 어긋난다**).

```ts
export type ReportStatisticsResponse = S['ReportStatisticsResponse'];
export type ReportMonthlyResponse    = S['ReportMonthlyResponse'];
export type ReportCalendarResponse   = S['ReportCalendarResponse'];
export type RatingBucketResponse     = S['RatingBucketResponse'];
export type PreferenceItemResponse   = S['PreferenceItemResponse'];
export type MonthlyTrendItemResponse = S['MonthlyTrendItemResponse'];
export type WatchTypeCountResponse   = S['WatchTypeCountResponse'];
export type OttPlatformCountResponse = S['OttPlatformCountResponse'];
export type DecadeCountResponse      = S['DecadeCountResponse'];
export type WeekdayCountResponse     = S['WeekdayCountResponse'];
export type MovieRatingGapResponse   = S['MovieRatingGapResponse'];
export type RewatchItemResponse      = S['RewatchItemResponse'];
export type OldestWatchedResponse    = S['OldestWatchedResponse'];
```

---

## 3. 훅과 캐시

### 3.1 `queryKeys.report`

```ts
report: {
  statistics: (userId: number) => ['report', 'statistics', userId] as const,
  monthly:  (userId: number, year: number, month: number) =>
    ['report', 'monthly', userId, year, month] as const,
  calendar: (userId: number, year: number, month: number) =>
    ['report', 'calendar', userId, year, month] as const,
},
```

**월을 키에 넣는 이유** — 캘린더는 월을 넘길 때마다 호출된다. 월이 키에 없으면 이전 달로 돌아갈 때
매번 재요청하고, 있으면 캐시가 그대로 산다.

### 3.2 `useReport.ts`

```ts
export const useReportStatistics = (userId?: number) =>
  useQuery({ queryKey: queryKeys.report.statistics(userId!), queryFn: () => reportApi.statistics(userId!),
             enabled: userId != null });

export const useMonthlyReport = (userId: number | undefined, year: number, month: number) => …
export const useCalendar      = (userId: number | undefined, year: number, month: number) => …
```

### 3.3 ★ 무효화 매트릭스 — `M2B-screens-spec.md` §3.2에 이어 붙인다

| 동작 | 추가 무효화 |
|---|---|
| 기록 생성 (`recordApi.create`) | **`['report']`** |
| 기록 수정 (`recordApi.update`) | **`['report']`** |
| 기록 삭제 (`recordApi.remove`) | **`['report']`** |
| 대표 지정 (`setRepresentative`) | **`['report']`** |
| **리뷰 작성·수정 (`reviewApi.write`)** | **`['report']`** |
| **리뷰 삭제** | **`['report']`** |

**프리픽스 통째로 무효화한다.** 지표가 서로 얽혀 있어(같은 기록이 편수·시간·장르·요일·연대에 동시에
기여한다) 부분 무효화가 의미를 갖지 못한다.

⚠️ **리뷰를 빠뜨리기 쉽다.** `reviewRate`가 `리뷰 수 / movieCount`라 **기록을 건드리지 않고 리뷰만
써도 통계가 바뀐다.** 기록 쪽 네 개만 보다가 놓치는 자리다.

⚠️ **반대로, 찜(`wish`)은 리포트에 영향이 없다.** 위시는 리포트 지표에 들어가지 않는다
(`M3a-report-spec.md` 4-8 — 위시→관람 전환율은 스키마상 정확히 낼 수 없어 채택하지 않았다).
습관적으로 넣지 말 것.

---

## 4. 차트와 공통 부품

### 4.1 `react-native-gifted-charts` 설치

```bash
npm i react-native-gifted-charts
```

⚠️ **설치 후 빌드 통과를 먼저 확인한다.** 이 라이브러리는 `react-native-svg`에 의존하는데
M2-A에서 이미 설치돼 있으므로 추가 네이티브 의존은 없어야 한다 — **Dev Client 재빌드 없이
JS 번들만으로 동작해야 정상이다.** 재빌드가 필요해지면 그 사실 자체를 기록할 것.

쓰는 것은 둘뿐이다.

| 차트 | 쓰는 곳 |
|---|---|
| `BarChart` | 별점 분포(10버킷) · 월별 추이 · 요일 · 연대 |
| `PieChart` | 관람 방식 · 월말 평점 분포 |

### 4.2 공통 부품

| 부품 | 역할 |
|---|---|
| `SectionCard` | 제목 + 본문 카드. 리포트 10개 섹션의 공통 껍데기 |
| `StatTile` | 큰 숫자 + 단위 + 라벨 (와이어프레임 상단 2열 타일) |
| `RankRow` | 순위 뱃지 + 이름 + 부가정보 (선호 TOP·재관람 공용) |
| `WEEKDAY_LABELS` | §6.2 요일 상수 |

---

## 5. 화면별 구현

### 5.1 `Report` — 시청 분석 (마이페이지 진입)

**한 화면 스크롤.** 섹션 분할·지연 로딩은 하지 않는다 — 실기기에서 로딩이 실제로 문제가 되면
그때 논의한다(백엔드 5-8의 *"C안 재검토 조건"* 이 그 자리다).

**섹션 순서 (2026-09-22 확정)**

```
1  요약 타일        movieCount · watchCount · totalWatchedMinutes · averageRating
2  별점 분포        ratingDistribution — BarChart 10버킷
3  선호 TOP         topGenres · topCountries · topDirectors · topActors
4  월별 추이        monthlyTrend — BarChart
5  관람 방식        watchTypeDistribution + ottPlatformDistribution
6  나와 대중        ratingBiasAverage + mostOverratedByMe / mostUnderratedByMe
7  다시 본 영화     rewatchCount + rewatchTop
8  연대와 고전      releaseDecadeDistribution + classicCount + oldestWatched
9  요일             weekdayDistribution
10 기록 습관        firstRecordDate + 리뷰 편수
```

> 와이어프레임 상단(요약 → 별점 분포 → 선호 TOP)을 유지하고 신규 지표를 뒤에 붙였다.
> **순서 변경 비용이 낮으므로**(섹션이 서로 독립이다) 실기기에서 보고 조정한다.

#### 섹션별 ⚠️ — 전부 백엔드 계약에서 나온 것이다

**1. 요약 타일**

- `averageRating`은 **0.0~10.0 스케일**이다. 화면은 `÷2`해서 5점 만점으로 보여준다(§7.3 계약).
- `movieCount`(고유 편수)와 `watchCount`(전 회차)는 **다른 지표다.** 둘 다 보여준다 —
  *"135편 · 총 152회 관람"*. 하나만 보여주면 *"편수가 왜 이것밖에 안 되지"* 가 된다.
- `totalWatchedMinutes`는 **분 단위**로 내려온다. 시간 변환은 화면이 한다.

**2. 별점 분포**

- ⚠️ **`ratingDistribution`은 항상 10개다** (`count: 0` 포함). 서버가 빈 버킷을 채워서 준다 —
  **데이터에 따라 축이 달라지면 월별 비교가 불가능**하기 때문이다.
- **10버킷을 그대로 그린다.** 5구간으로 묶고 싶으면 프론트에서 묶되, **서버 값을 먼저 받아둔다** —
  서버가 미리 뭉개면 복원이 불가능하다.
- x축 라벨은 `÷2`한 별 단위(0.5 ~ 5.0)로 표기한다.

**3. 선호 TOP**

- ⚠️ **`score`로 정렬돼 있다. 카드에 `count`(편수)를 부제로 쓰지 않는다.**
  쓰면 *"12편"* 인 2위가 *"15편"* 위에 오는 화면이 나와 사용자 눈에 버그로 보인다
  (`M3a-report-spec.md` RA-4). 편수를 보여주려면 제목을 *"많이 본"* 으로 바꿔야 하는데,
  그건 다른 지표다.
- 장르·국가는 `count`가 없을 수 있다(서버 DTO 기준). 순위와 이름만 쓴다.

**4. 월별 추이**

- ⚠️ **`monthlyTrend`는 `watch_date`가 있는 기록만 담는다.** 합계가 `watchCount`보다 작다.
  → **차트 옆에 `undatedCount`를 표기한다** — *"날짜 미상 12편 제외"*.
  표기하지 않으면 사용자가 숫자가 안 맞는 이유를 알 수 없다.
- 공백 달은 **서버가 이미 0으로 채워서** 준다. 프론트는 그대로 그린다.
- 전 기간이 온다(최대 240개). 가로 스크롤 `BarChart`로 그리고, 기본 뷰포트는 **최근 12개월**에 맞춘다.

**5. 관람 방식**

- ⚠️ **버킷은 4개다** — `THEATER` / `OTT` / `ETC` / **`UNSPECIFIED`**. `watchType`이 nullable이라
  미지정 버킷이 존재하며, **빼면 합계가 `watchCount`와 맞지 않는다.**
- ⚠️ **`UNSPECIFIED`가 과반이면 차트를 그리지 않는다.** 대신
  *"관람 방식을 기록하면 분포를 볼 수 있어요"* 유도 문구를 띄운다. 미지정이 화면을 채우는 파이차트는
  정보가 아니라 잡음이다(RA-5 빈 상태 규칙의 변종).
- OTT 플랫폼 분해는 `OTT` 버킷 아래 접히는 목록으로.

**6. 나와 대중**

- `ratingBiasAverage`는 **0을 기준으로 ±** 다. *"평단보다 평균 +1.2점 후하게"*.
- `mostOverratedByMe` / `mostUnderratedByMe`는 **nullable** — 대중 평점이 있는 기록이 없으면 null이다.
- 이 섹션이 영화 제목이 붙는 유일한 "이야기" 섹션이다. 포스터를 함께 보여준다.

**7. 다시 본 영화**

- `rewatchTop`이 비면 섹션 자체를 숨긴다(재관람이 없는 것은 정상이다).
- ⚠️ 이 섹션이 있으면 **1번의 `movieCount` ≠ `watchCount`를 화면이 저절로 설명한다.**

**8. 연대와 고전**

- 버킷이 **비선형**이다 — `2020s / 2010s / 2000s / 1990s / 1980s / 1970s / ~1960s / UNKNOWN`.
  균등 10년 버킷이 아니므로 **x축 간격을 균등하게 두되 라벨을 그대로 쓴다.**
- `classicCount`(2000년 이전)는 **성취 카운터**다. 차트보다 큰 숫자로 강조한다.
- `oldestWatched`는 nullable. 있으면 *"가장 오래된 관람작"* 한 줄로.

**9. 요일** — §6.2 참고.

**10. 기록 습관**

- `firstRecordDate`로 *"CineMory와 함께한 N일"* 을 계산한다(nullable — 기록이 없으면 null).
- ⚠️ **`reviewRate`(0~1 비율)를 퍼센트로 쓰지 않는다.** §6.3 참고.

#### 빈 상태

- 기록 0건이면 **404가 아니라 빈 값이 200으로** 온다(RA-5). `EmptyState`로 *"아직 기록이 없습니다"* +
  기록 남기기 유도. **폴백 콘텐츠(인기작 등)를 끼워 넣지 않는다** — 리포트는 비어 있는 것이 정답이다.
- 섹션별로도 비면 그 섹션만 숨기거나 빈 문구를 둔다(위 각 섹션 참고).

### 5.2 `Calendar`

- 월 이동 UI(이전/다음). **초기 월은 오늘**이다 — ⚠️ 와이어프레임의 `new Date(2026, 4, 1)`
  하드코딩을 그대로 옮기지 말 것.
- ⚠️ **다음 달로 넘어가도 400이 아니다.** 서버가 미래 월을 거부하지 않고 **빈 결과 200**으로 준다
  (RA-2) — 캘린더가 월 이동 UI라 다음 달을 누르는 것이 정상 동작이기 때문이다. 이동을 막지 말 것.
- ⚠️ **하루에 여러 편이 가능하다.** `days[].records`는 **배열**이다 — 와이어프레임의
  `useCalendarData`가 날짜당 한 편으로 하드코딩한 것은 **데이터 모델과 맞지 않는다.**
  셀에는 최대 N개를 점/썸네일로 표시하고 탭하면 그날 목록을 펼친다.
- 상단에 **월말 리포트 진입 버튼**을 둔다 — 현재 보고 있는 `year`/`month`를 그대로 넘긴다.

### 5.3 `MonthlyReport` — 월말

- **진입 시점의 월로 고정**한다. 월 이동은 캘린더가 담당한다(뒤로 가서 월을 바꾸고 다시 진입).
  두 화면에 같은 월 이동 UI를 두면 상태가 갈린다.
- 표시 지표는 누적의 부분집합 + 월 한정 둘 —
  - `mostWatchedDirector` — ⚠️ **누적의 `topDirectors`와 기준이 다르다.** 이쪽은 **편수(count) 기준**이고
    문구도 *"가장 많이 본 감독"* 이다. 누적은 score 기준의 *"선호 감독"* 이다. **문구를 섞지 말 것.**
  - `mostWatchedWeekday` — **nullable `Integer`**. 한 줄 문구로만 쓴다(§6.2).
- ⚠️ **월말에는 요일 차트를 그리지 않는다.** 한 달 표본은 요일당 1~2편이라 **노이즈를 패턴으로
  읽게 된다.** 차트는 누적에서만.

### 5.4 마이페이지 캘린더 요약 위젯

- `CalendarView`에 **`compact` prop**을 두어 마이페이지 요약과 상세 화면이 **같은 부품을 공용**한다
  (`M2-frontend-spec.md` §9.8).
- 이번 달 캘린더를 축소해 보여주고, 탭하면 `Calendar` 상세로 이동한다.
- **쿼리 키가 상세와 같으므로**(`['report','calendar',userId,year,month]`) 상세 진입 시 재요청이 없다.

---

## 6. 확정 사항 (2026-09-22)

### 6.1 진입 구조

```
MyPage
 ├─ 메뉴 "시청 분석"        → Report        (이미 존재하는 진입점)
 └─ 캘린더 요약 위젯 (탭)   → Calendar
                              └─ "이달의 리포트" → MonthlyReport
```

**캘린더를 메뉴 항목이 아니라 요약 위젯으로 두는 이유** — §9.8이 `compact`를 전제로 설계돼 있고,
*"이번 달에 뭘 봤나"* 가 마이페이지에서 바로 보이는 편이 메뉴를 한 단계 더 타는 것보다 낫다.

### 6.2 ★ 요일 매핑 — 1-based 배열로 고정

세 기준의 **오프셋이 다르다.**

```
MySQL DAYOFWEEK()      1=일 … 7=토     ← 서버가 주는 값
JS    getDay()         0=일 … 6=토
와이어프레임 캘린더 헤더    ['일','월','화','수','목','금','토']
```

셋 다 **일요일 시작**이라 순서는 같고 오프셋만 다르다. 그래서 —

```ts
// index = 서버의 DAYOFWEEK 값. 0번은 의도적으로 비운다.
export const WEEKDAY_LABELS = ['', '일', '월', '화', '수', '목', '금', '토'] as const;
```

- **서버 값을 변환 없이 그대로 인덱싱**하므로 오프바이원이 구조적으로 불가능하다.
- ⚠️ **월요일 시작으로 재배열하지 않는다.** 같은 화면 흐름에 있는 캘린더가 일요일 시작인데
  요일 차트만 월요일 시작이면 읽는 사람이 헷갈린다.
- `getDay()`와 섞이는 지점에서만 `+1`을 하고, **그 변환을 이 상수 옆 한 곳에 모은다.**

### 6.3 ★ `reviewRate`는 비율로 쓰지 않는다

```java
reviewRate = movieCount == 0 ? 0.0 : (double) 리뷰수 / movieCount;
```

⚠️ **100%를 넘을 수 있다.** 리뷰는 시청 기록 없이도 쓸 수 있어서(기획노트 2-3) 기록 2편에 리뷰 3개면
`1.5`가 오고 화면에 **"150%"** 가 찍힌다.

→ **두 숫자를 그대로 보여준다** — *"135편 중 42편에 리뷰"*.
비율은 어차피 분모의 의미를 설명해야 하고, 두 숫자면 설명이 필요 없다.
`reviewRate`에서 리뷰 편수를 역산한다(`Math.round(reviewRate * movieCount)`).

### 6.4 연말 리포트 — 만들지 않는다

§0.3 참고.

---

## 7. 검증 절차

### 7.1 핵심 동선

1. 마이페이지 → **시청 분석** → 10개 섹션이 모두 그려진다
2. 기록을 하나 추가 → 마이페이지로 → 시청 분석 → **편수·시간이 늘어 있다** (무효화 확인)
3. **리뷰만 하나 작성** → 시청 분석 → **"N편 중 M편에 리뷰"의 M이 늘어 있다** (⚠️ 놓치기 쉬운 경로)
4. 마이페이지 캘린더 요약 → 탭 → 상세 → **재요청 없이 즉시 표시**(캐시 공유)
5. 캘린더에서 **다음 달로 이동** → 400이 아니라 빈 달이 보인다
6. 캘린더 → **이달의 리포트** → 월말 화면, 진입한 월과 같다

### 7.2 경계 케이스

| 케이스 | 기대 |
|---|---|
| 기록 0건 계정 | `EmptyState`. 404가 아니다 |
| 별점 0건 | 별점 분포 10버킷이 전부 0. 축이 사라지지 않는다 |
| 재관람 0건 | "다시 본 영화" 섹션이 숨는다 |
| `watchType` 미지정 과반 | 파이차트 대신 유도 문구 |
| 하루에 2편 이상 기록 | 캘린더 셀에 여러 개가 표시된다 |
| `watch_date` 없는 기록 | 월별 추이에서 빠지고 *"날짜 미상 N편 제외"* 가 보인다 |
| 대중 평점 없는 영화만 봄 | "나와 대중" 섹션이 숨거나 빈 문구 |

### 7.3 게스트 · 타인

- **비로그인** — 경로가 `permitAll GET`이라 필터는 통과하지만 `UserAccessPolicy`가 판정한다.
  자기 `userId`가 없으므로 게스트는 리포트에 진입할 수 없다. `useRequireAuth()`로 게이트한다.
- **비공개 사용자의 리포트** — **403 `ACCESS_DENIED`**(404가 아니다).
  ⚠️ **인터셉터가 403을 로그아웃 대상으로 처리하면 안 된다** — `M2C-screens-spec.md` §6.2에서 이미
  확인한 규칙이다. 401만 재발급·로그아웃 대상이다.

---

## 8. 하지 않을 것

- **연말 결산** (§0.3 · §6.4)
- **섹션 탭 분할 · 지연 로딩** — 한 화면 스크롤로 간다. 로딩이 실제 문제가 되면 그때 논의한다
- **리포트 공유 · 이미지 내보내기** — `M3a-report-spec.md` 8절에서 범위 밖으로 확정
- **추천(M3-b)** — R-2·R-4 미결
- **알림** — *"이달의 리포트가 나왔습니다"* 류는 M4

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-09-28 | **리포트 3화면 헤더 아래 빈 띠 제거.** 실기기에서 *"불필요한 툴바"* 로 보인다는 피드백 — 실제 툴바가 아니라 `Screen`의 기본 `edges`(`top` 포함)가 **네이티브 헤더가 이미 소화한 상단 안전영역을 한 번 더** 더해 생긴 빈 띠였다(M2-B에서 `MyRecords`가 먼저 밟은 것과 같은 원인). `ReportScreen`·`CalendarScreen`·`MonthlyReportScreen`의 모든 상태(로딩·에러 포함)를 `edges={['left', 'right']}`로. ⚠️ **같은 패턴이 헤더 있는 다른 화면에도 남아 있다** — `SearchResultScreen`·`SettingsScreen`·`MyPageScreen`과 컬렉션·서재 화면의 로딩/에러 상태. 이번엔 요청 범위(리포트)만 고쳤다. → 이어서 **`SearchResultScreen`도 수정**(본 화면까지 기본값이라 띠가 실제로 보였다). 나머지 화면의 로딩·에러 상태도 **로딩→본 화면 전환 때 내용이 튀는 것**을 없애려 `left/right`로 통일했다. 예외는 `_placeholder.tsx` — 헤더 없는 `AuthNavigator`에서도 쓰여 top이 필요하다. `tsc` 통과 |
| 2026-09-26 | **§7 검증 수정 1 — 별점 분포에 4.5·5.0 막대가 안 보이던 문제.** 원인은 데이터가 아니라 레이아웃: `ReportBarChart`가 막대 폭 24 + 간격 16 고정이라 10버킷이면 ≈400px로 카드 폭(폰 기준 ≈280~300px)을 넘는데, `disableScroll`이라 오른쪽 두 막대가 잘렸다. **스크롤을 켜는 안은 기각** — §4.1 "10버킷을 그대로 그린다"의 취지는 분포 형태를 한눈에 보는 것이라 스크롤하면 의미가 없다. 대신 **스크롤을 끈 차트는 `onLayout`으로 카드 폭을 재서 칸 폭 = (폭 − y축 라벨 35) ÷ 막대 수로 맞추고, 칸이 기본값(40)보다 좁을 때만 막대 60%·간격 40%로 줄인다.** 양끝 여백은 간격의 절반이라 전체 폭 = 칸 폭 × 막대 수로 정확히 들어간다. x축 라벨 폭은 gifted-charts가 막대+간격으로 잡아 자동으로 칸에 맞는다. 요일(7개)도 같은 경로를 탄다. 스크롤 차트(월별·연대)는 기존 값 유지 |
| 2026-09-23 | **§1 실행 순서 1~10번 구현 완료 — 실기기 검증(§7) 전.** 화면 셋(`ReportScreen`·`CalendarScreen`·`MonthlyReportScreen`) + 마이페이지 캘린더 요약 위젯을 `MyPageStack`에 붙였다. 설계 문서와 달랐던 점 없음 — API 파라미터·타입 별칭·무효화 매트릭스·화면 규칙(§5.1~§5.4) 전부 이 문서 그대로 반영. `react-native-gifted-charts` 설치 후 `npx expo export --platform android`로 JS 번들만으로 동작함을 확인(추가 네이티브 의존 없음). `npx tsc --noEmit` 통과. **다음은 §7 검증** — 특히 리뷰만 작성했을 때 통계 갱신(7.1-3), 캘린더 다음 달 이동 시 400 아님(7.1-5), 캘린더 요약 위젯 탭 시 재요청 없음(7.1-4, 쿼리 키 공유) 세 가지가 실기기에서 놓치기 쉬운 경로다 |
| 2026-09-22 | **M2-C2 설계 확정 — 리포트 화면 셋 + 마이페이지 캘린더 요약 위젯.** B-8이 해소돼(백엔드 M3-a 완료) M2-C §0.2에서 분리해 둔 `Report`를 연다. **진입 구조** — 시청 분석은 마이페이지 메뉴(이미 존재), 캘린더는 **마이페이지 요약 위젯**(§9.8이 `compact`를 전제로 설계돼 있었고, *"이번 달에 뭘 봤나"* 가 마이페이지에서 바로 보이는 편이 낫다), 월말은 **캘린더에서 진입**(현재 보고 있는 `year`/`month`를 그대로 넘긴다). **월말 화면에는 월 이동 UI를 두지 않는다** — 캘린더와 둘 다 두면 상태가 갈린다. ⚠️ **연말 리포트는 만들지 않는다(A안)** — 백엔드에 `/report/yearly`가 없고 `M3a-report-spec.md` 8절이 이미 범위 밖으로 확정했다. `monthlyTrend`로 흉내내는 안은 **얻는 것이 편수·회차·시간 셋뿐**이라 *"올해의 감독·장르"* 가 안 나와 기각했다. **한 화면 스크롤**로 가고 섹션 분할은 로딩이 실제 문제가 될 때 논의한다(백엔드 5-8의 C안 재검토 조건이 그 자리다). ★ **요일 매핑을 1-based 배열로 고정** — `DAYOFWEEK()`(1=일)·`getDay()`(0=일)·캘린더 헤더 셋의 **오프셋이 달라** 오프바이원이 나기 쉬운데, `['', '일', …]`로 0번을 비우면 **서버 값을 변환 없이 인덱싱**해 구조적으로 막힌다. 월요일 시작 재배열은 **같은 흐름의 캘린더가 일요일 시작이라** 기각. ★ **`reviewRate`를 비율로 쓰지 않는다** — 리뷰는 기록 없이도 쓸 수 있어 **1.0을 넘을 수 있고**(기록 2편에 리뷰 3개 → "150%"), 두 숫자(*"135편 중 42편에 리뷰"*)면 분모 설명도 필요 없다. ★ **무효화에 리뷰를 포함**했다 — `reviewRate` 때문에 **기록을 건드리지 않고 리뷰만 써도 통계가 바뀐다.** 반대로 **찜은 리포트에 영향이 없어** 습관적으로 넣지 않도록 명시했다. 화면 규칙은 백엔드 `M3a-report-spec.md` 7절에서 가져왔다 — 날짜 미상 표기 · 선호 카드에 편수 쓰지 않기 · 미지정 과반 시 유도 문구 · 10버킷 그대로 받기 |
