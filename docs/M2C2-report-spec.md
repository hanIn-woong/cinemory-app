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
| `PeriodReport` (월간 \| 연간 탭) — 2026-10-05 `MonthlyReport`에서 개명 | **캘린더 화면에서 진입** | `GET /report/monthly?year=&month=` · `GET /report/yearly?year=` |
| `CalendarSummary` 위젯 | 마이페이지에 상주 | 위와 같은 캘린더 쿼리 재사용 |

> ✅ **2026-10-05 정정 — 연간 리포트를 넣는다(§9).** 아래는 9월 당시의 판단 기록이다.

~~⚠️ **연말 리포트는 만들지 않는다 (2026-09-22 확정, A안).**~~
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
  yearly:     (userId: number) => `/api/users/${userId}/report/yearly`,   // 2026-10-05 (§9)
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
  yearly: (userId: number, year: number) => ['report', 'yearly', userId, year] as const,  // 2026-10-05 (§9)
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

- ~~⚠️ **`score`로 정렬돼 있다. 카드에 `count`(편수)를 부제로 쓰지 않는다.**~~
  쓰면 *"12편"* 인 2위가 *"15편"* 위에 오는 화면이 나와 사용자 눈에 버그로 보인다
  (`M3a-report-spec.md` RA-4). 편수를 보여주려면 제목을 *"많이 본"* 으로 바꿔야 하는데,
  그건 다른 지표다.
- ~~장르·국가는 `count`가 없을 수 있다(서버 DTO 기준). 순위와 이름만 쓴다.~~
- **→ 2026-09-28 변경(B안): 편수를 보여 주되 정렬 기준을 섹션 상단에 밝힌다.** 사용자 요청(OTT처럼
  개수 표시). 정렬은 그대로 `score`이고, 행마다 `N편`, 섹션 상단에 *"별점 기준 선호도 순 · 편수는 별점을
  준 작품 수예요"*. 근거 셋 —
  ① **역전은 실데이터에서 실제로 난다** — 관리자 계정(1,035건) 기준 국가 2위 대한민국 118편 < 3위 영국
  122편, 배우 1위 윌렘 대포 11편 < 2위 안토니오 반데라스 12편. 설명 없이 숫자만 두면 위 경고 그대로다.
  ② **`count`는 `rating IS NOT NULL`인 대표 기록만 센다** — *"본 편수"* 가 아니라 *"별점 준 편수"* 라
  그 뜻을 문구에 넣었다. ③ OTT의 `N회`(재관람 포함)와 단위를 구분해 `N편`.
  장르·국가의 `count`도 서버가 채운다(4종 모두 `COUNT(*)`, 2026-09-28 쿼리 확인 — 위 취소선의 우려는 해소).
  **검토했으나 택하지 않은 것**: 프론트에서 편수로 재정렬(score TOP 5 ≠ 편수 TOP 5라 틀린 목록이 된다),
  편수 기준으로 서버 정렬 변경·"많이 본 TOP" 추가(RA-4의 지표 결정을 뒤집는 일이라 범위가 커진다).

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
- **날짜 칸 = 포스터 (2026-10-08, full 모드만).** 기록이 있는 날은 칸 전체를 **그날 마지막 기록**
  (`records[records.length - 1]` — 서버가 날짜 → 기록 id 오름차순)의 포스터로 채운다(`PosterImage`
  `size="SHELF"` w185, `radius.sm`). 날짜 숫자는 좌상단 반투명 배지(`colors.scrim` + 흰 글씨), 여러 편이면
  우하단에 `+N`(기록 수 − 1) — **`+N`은 `colors.primary` 배경 + `foreground` 글씨**로 날짜 배지와 구분한다. 포스터 없는 영화는 `PosterImage`의 그라디언트 폴백 + 같은 배지. 기록 없는 날은
  숫자만. **선택 표시는 원형 배경이 아니라 칸 테두리 2px `colors.primary`** — 포스터를 가리지 않게.
  칸 안쪽 여백 1dp(이웃과 합쳐 2dp)로 포스터끼리 붙어 보이지 않게 한다. compact(마이페이지 위젯, 칸 32px)는
  숫자 + 점 그대로.
- **앞뒤 달 미리 받기 (2026-10-08).** 지금 달이 뜨고(`isSuccess`) **들어오는 슬라이드가 끝난 뒤**에 이전·다음 달
  캘린더를 `fetchQuery`로 캐시에 넣고 그 달 칸 포스터(같은 규칙 · SHELF — URL이 같아야 캐시가 맞는다)를
  `Image.prefetch(..., { cachePolicy: 'disk' })`로 디스크까지만 받는다(`useCalendarNeighborPrefetch`).
  ⚠️ 슬라이드 중에 시작하거나 `memory-disk`(받자마자 디코드)로 받으면 스와이프가 나빠진다(실기기 확인).
  미리 받기는 앞뒤 한 달만이라 **초당 한 달보다 빠르게 넘기면 여전히 로딩이 보인다** — 수용.
- 상단에 **월말 리포트 진입 버튼**을 둔다 — 현재 보고 있는 `year`/`month`를 그대로 넘긴다.

### 5.3 `MonthlyReport` — 월말

> **2026-10-05 — `PeriodReport`의 월간 탭이 됐다**(§9.2). 아래 규칙은 월간 탭에 그대로 적용된다.

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
- **위젯은 화면 아래 끝(탭바 위)까지 늘린다**(2026-10-02) — 아래의 시청 분석 리포트 박스는 스크롤해야
  보인다(사용자 요청). 고정 숫자로 키우면 기기마다 리포트가 보였다 안 보였다 하므로, 위젯 위치·높이를
  `onLayout`으로 재서 **칸 높이(`compactCellHeight`)만** 조정한다(제목·요일줄·패딩은 그대로라 한 번에
  맞는다). 범위 32~72px, 달마다 5·6주 차이도 반영. 제목은 쉐브런 폭만큼 왼쪽을 비워 **가운데 정렬**
  (요일 그리드와 축을 맞춘다), 테두리는 브랜드 컬러.
- **캘린더 상세(`Calendar`)** — 좌우 스와이프로 달 이동(왼쪽 = 다음 달). 손가락을 따라 움직이다가
  40px 이상 또는 초당 300px 이상 튕기면 밀어낸 방향으로 나가고 새 달이 반대편에서 들어온다(각 140ms).
  화살표 버튼도 같은 전환. 세로가 먼저 20px 움직이면 포기해 세로 스크롤·날짜 탭을 뺏지 않는다.
  ⚠️ 들어오는 애니메이션은 새 달이 **그려진 뒤**(이펙트) 시작한다 — 달 변경 직후 바로 시작하면 옛 달이
  몇 프레임 다시 들어오는 게 보일 수 있다. "이달의 리포트" 진입은 버튼이 아니라 시청 분석과 같은
  그라디언트 박스(`ReportLinkCard`, `compact` 크기)다.

---

## 6. 확정 사항 (2026-09-22)

### 6.1 진입 구조

```
MyPage
 ├─ 시청 분석 리포트 박스   → Report        (2026-10-02 메뉴 항목 → 그라디언트 박스)
 └─ 캘린더 요약 위젯 (탭)   → Calendar
                              └─ "이달의 리포트" → PeriodReport  [월간 | 연간]   (2026-10-05, §9)
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

### 6.4 연간 리포트 — ~~만들지 않는다~~ → **2026-10-05 정정, 넣는다**

§9 참고. 9월 당시 *"반쪽 화면을 만드는 대신 열지 않는다"* 고 판단한 근거(`monthlyTrend`로 흉내내면 편수·회차·시간
셋뿐)는 **백엔드 엔드포인트를 새로 두는 것으로** 해소됐다.

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
| 하루에 2편 이상 기록 | 캘린더 셀에 마지막 기록 포스터 + 우하단 `+N` (§5.2) |
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

- ~~**연말 결산** (§0.3 · §6.4)~~ → 2026-10-05 정정, §9로 넣었다
- **연도 이동 UI** — 연간은 진입한 캘린더의 연도로 고정한다(§9.1)
- **섹션 탭 분할 · 지연 로딩** — 한 화면 스크롤로 간다. 로딩이 실제 문제가 되면 그때 논의한다
- **리포트 공유 · 이미지 내보내기** — `M3a-report-spec.md` 8절에서 범위 밖으로 확정
- **추천(M3-b)** — R-2·R-4 미결
- **알림** — *"이달의 리포트가 나왔습니다"* 류는 M4

---

## 9. 연간 리포트 (2026-10-05 추가)

> §0.3 · §6.4에서 *"만들지 않는다"* 로 확정했던 것을 **정정**한다.
> 백엔드 계약은 `cinemory-backend/docs/M3a-report-spec.md` **10절** · `controller-layer-spec.md` **5-8-F** ·
> `service-layer-spec.md` **4-8-H**. 이 절은 화면이 그것을 어떻게 쓰는지만 정한다.

### 9.1 확정 사항

| 항목 | 결정 |
|---|---|
| 진입 | **월간과 같다** — 캘린더 → 리포트 화면 |
| 전환 | 한 화면 안의 **월간 \| 연간 세그먼트 탭**. ⚠️ **스와이프 없음**(Pager를 쓰지 않는다) |
| 연도 | 진입한 캘린더의 `year`로 **고정**. 연도 이동 UI 없음 — 월간이 월을 고정하는 것과 같은 이유(§5.3) |
| 지표 | 월간 전부 + 5점작 · 많이 본 장르·국가(**편수**) · 많이 본 배우 · 월별 추이 12개 · 요일 분포 |
| 현재 연도 | **"올해" 표시만**. 판정은 **클라이언트가 기기 날짜로**(`year === new Date().getFullYear()`) — 서버는 판단하지 않는다(RA-2) |
| 5점작 | 포스터 + 제목 **4열**, **5점을 준 날짜순**, 12편 초과 시 **제자리 더보기** |

### 9.2 ★ 화면 개명 — `MonthlyReport` → `PeriodReport`

월간·연간을 탭으로 담는 화면이 `MonthlyReport`라는 이름이면 연간 코드가 *"월간 화면 안의 연간"* 이 되어
읽는 사람이 의도를 의심한다. 백엔드가 `Monthly` → `Period`로 개명한 것과 맞춘다(4-8-H).

| 대상 | 변경 |
|---|---|
| `navigation/types.ts` | `MonthlyReport: { year; month }` → **`PeriodReport: { year: number; month: number; initialTab?: 'monthly' \| 'yearly' }`** |
| 화면 파일 | `MonthlyReportScreen.tsx` → **`PeriodReportScreen.tsx`** |
| 캘린더의 진입 버튼 | `navigate('PeriodReport', { year, month })` — 기본 탭은 **월간** |

### 9.3 API · 훅 · 캐시

```ts
// endpoints.ts
yearly: (userId: number) => `/api/users/${userId}/report/yearly`,

// api/report.ts — ⚠️ year 필수, 서버 기본값 없음(월간과 같다)
yearly: (userId: number, year: number) =>
  api.get<ReportYearlyResponse>(EP.report.yearly(userId), { params: { year } }).then((r) => r.data),

// queryKeys
yearly: (userId: number, year: number) => ['report', 'yearly', userId, year] as const,

// useReport.ts — ⚠️ enabled로 지연 로딩
export const useYearlyReport = (userId: number | undefined, year: number, enabled: boolean) =>
  useQuery({ queryKey: queryKeys.report.yearly(userId!, year),
             queryFn: () => reportApi.yearly(userId!, year),
             enabled: enabled && userId != null });
```

- **연간 탭을 처음 누를 때만 요청한다**(`enabled = tab === 'yearly'`). 연간 집계는 쿼리 11개라 월간만 보고
  나가는 사용자에게 매번 돌릴 이유가 없다. 한 번 받은 뒤에는 캐시가 살아 있어 탭을 왕복해도 재요청이 없다.
- **무효화 추가 작업 없음** — §3.3의 `['report']` 프리픽스 무효화가 `['report','yearly',…]`를 이미 덮는다.
- 타입 별칭 — `ReportYearlyResponse`, `FiveStarMovieResponse`(`gen:api` 스키마명 그대로, §2.3 원칙).

### 9.4 `PeriodReport` 화면

- 상단 세그먼트 `[월간 | 연간]`, 탭 상태는 화면 로컬(`useState`), 초기값은 `initialTab ?? 'monthly'`.
- 헤더 — 월간 *"2026년 9월"*, 연간 *"2026년"* + **현재 연도면 "올해" 뱃지**.
- **하나의 `ScrollView`, 탭 전환 시 맨 위로 스크롤**한다. 두 탭의 길이가 달라 위치를 유지하면 엉뚱한 섹션 중간에 떨어진다.
- 월간 탭은 §5.3 그대로다. ⚠️ 다만 **백엔드 집계 기준이 바뀌어**(10-5) 재관람이 있는 사용자는 같은 달 숫자가
  이전과 달라질 수 있다 — 의도된 정정이며 프론트 수정은 없다.

**연간 탭 섹션 순서** (순서 변경 비용이 낮으므로 실기기에서 조정한다)

```
1  요약 타일          movieCount · watchCount · totalWatchedMinutes · averageRating(÷2)
2  올해 5점을 준 작품   fiveStarMovies — 4열 그리드 (§9.5)
3  별점 분포          ratingDistribution — 10버킷
4  월별 추이          monthlyTrend — 12개 고정 BarChart
5  관람 방식          watchTypeDistribution — 미지정 과반이면 유도 문구(§5.1 규칙 그대로)
6  올해 많이 본        감독 · 배우 · 장르 TOP 5 · 국가 TOP 5
7  요일              weekdayDistribution — BarChart, WEEKDAY_LABELS(§6.2)
```

**섹션별 ⚠️**

- **2와 3의 숫자가 다를 수 있다.** 5점작은 *"한 번이라도 5점을 준 작품"*, 분포는 *"영화당 그해 마지막 별점"* 이다
  (백엔드 10-2). 같은 해 5점 → 3점으로 다시 본 영화는 2에 있고 3의 5점 막대에는 없다. **섹션 제목을
  "올해 5점을 준 작품"으로 고정**하고, 분포와 비교하게 만드는 문구(*"5점 N편"* 같은 캡션)를 붙이지 않는다.
- **6은 편수를 보여줘도 된다.** §5.1이 선호 카드에 편수를 금지한 이유는 *score로 정렬돼 있어서*였다.
  여기는 **편수로 정렬**되므로 *"12편"* 이 순서와 맞는다. 제목은 반드시 *"많이 본"* — *"선호"* 를 쓰지 않는다.
  `mostWatchedDirector` · `mostWatchedActor`는 nullable.
- **7은 차트로 그린다.** 월간에서 요일 차트를 금지한 이유(한 달 표본은 요일당 1~2편)가 1년 표본에는 해당하지 않는다.
- **4는 12개가 항상 온다**(공백 달 0). 가로 스크롤 없이 한 화면에 그린다. 막대 최댓값 달을 강조하면
  *"가장 많이 본 달"* 이 따로 필요 없다.
- 기록 0건인 연도(미래 연도 포함) → 빈 값 200 → `EmptyState`.

### 9.5 ★ 5점작 그리드

리포트는 이미 포스터를 쓰고 있다(`PosterImage` — 다시 본 영화 · 나와 대중 · 캘린더). 새로 필요한 것은 셋이다.

**① 제목 표시 — `MovieGridItem`에 `showTitle?: boolean` 추가**

현재 `title`은 **접근성 라벨로만** 쓰인다(화면에 그리지 않는다). `showTitle`이면 포스터 아래에
`numberOfLines={2}`로 표시한다. ⚠️ **기본값 `false`** — 서재 그리드(`RecordsTab`·`WishesTab`)는 바뀌지 않는다.

**② 4열 — `FlatList`가 아니라 `flexWrap` View**

⚠️ 서재 그리드는 `FlatList numColumns`인데, 리포트는 **한 화면 `ScrollView`** 라 그 안에 `FlatList`를 넣으면
중첩 VirtualizedList 경고가 난다. `flexDirection: 'row', flexWrap: 'wrap'` + `gap`으로 4열을 만든다.

- **셀 폭은 `SectionCard` 내부 폭 기준** — 화면 폭이 아니다(카드 padding). `onLayout`으로 측정해
  `(innerWidth - GAP * 3) / 4`. 측정 전(0)에는 그리지 않는다.
- 360px 폰에서 셀이 대략 75px라 **`PosterSize.SHELF`(w185)** 를 쓴다. `LIST`(w342)는 이 크기에서 낭비다.

**③ 더보기 — 제자리 펼치기**

- 처음 **12편**, 넘으면 하단에 *"더보기 (N)"* → 탭하면 전부 펼치고 *"접기"* 로 바뀐다.
- **재요청 없음** — 서버가 전량을 내려준다(10-4). 자르기는 클라이언트 몫이다.
- 영화 상세의 *"시청 기록 더보기"* 는 별도 화면(`WatchLog`)으로 넘기지만, 여기는 **리포트 스크롤 안의
  한 섹션**이고 목록이 그해 본 영화 수로 상한이 있어 제자리가 맞다. 실기기에서 버벅이면 그때 별도 화면으로 옮긴다.

**나머지**

- 정렬은 **서버 순서 그대로**(`fiveStarDate` 오름차순 — 그해 처음 5점을 준 날). 클라이언트에서 다시 정렬하지 않는다.
- 포스터 탭 → 영화 상세. 다른 리포트 포스터와 같은 이동 방식을 쓴다.
- 비어 있으면 **섹션째 숨긴다**(다시 본 영화와 같은 규칙, §5.1).

### 9.6 실행 순서

| # | 작업 | 검증 지점 |
|---|---|---|
| 1 | 백엔드 4-8-H 구현 완료 확인 → `npm run gen:api` | `ReportYearlyResponse` 생성 |
| 2 | `MonthlyReport` → `PeriodReport` 개명 (§9.2) | `npx tsc --noEmit` |
| 3 | API · 키 · 훅 (§9.3) | |
| 4 | 세그먼트 탭 + 지연 로딩 (§9.4) | **연간 탭을 안 누르면 요청이 없다** |
| 5 | `MovieGridItem.showTitle` + 5점작 그리드 (§9.5) | 서재 그리드가 그대로다 |
| 6 | 연간 나머지 섹션 | |
| 7 | 검증 (§9.7) | |

### 9.7 검증

| 케이스 | 기대 |
|---|---|
| 월간만 보고 나감 | `/report/yearly` **요청 없음** |
| 연간 → 월간 → 연간 | 두 번째 연간에서 **재요청 없음** |
| 올해 / 작년 진입 | 올해만 *"올해"* 뱃지 |
| 5점작 13편 이상 | 12편 + *"더보기 (1)"*, 펼쳐도 요청 없음 |
| 같은 해 5점 → 3점 재관람 | 5점작에 **있음**, 분포 5점 막대에는 **없음** |
| 작년에 5점 준 영화를 올해 재관람(대표가 바뀜) | **작년 연간이 그대로** |
| 올해 기록 추가 · 리뷰 작성 | 연간도 갱신(`['report']` 프리픽스) |
| 캘린더에서 미래 월 → 리포트 → 연간 | 빈 값 → `EmptyState`. 400이 아니다 |
| 서재 그리드 | 제목이 **나오지 않는다**(`showTitle` 기본 false) |

#### 9.7.1 실기기 검증 절차 (2026-10-06 정리)

위 표를 **데이터를 건드리지 않는 것 → 건드리는 것** 순으로 묶었다. 앞 단계가 뒤 단계의 데이터를 오염시키지 않는다.

**준비**

| # | 할 일 | 이유 |
|---|---|---|
| P-1 | 백엔드를 연간 엔드포인트가 있는 브랜치(`feature/yearly-report`)로 `bootRun` — **요청 로그를 켜서**: `./gradlew bootRun --args='--logging.level.org.springframework.web.servlet.DispatcherServlet=DEBUG'` | "요청 없음"을 판정할 근거. 콘솔에 `GET "/api/users/{id}/report/yearly?year=…"` 줄이 찍히는지로 본다 |
| P-2 | 폰 ↔ PC 연결 — 기본 Wi-Fi는 AP 격리라 **폰 핫스팟 또는 USB + `adb reverse tcp:8080 tcp:8080`** | 메모리: AP 격리 |
| P-3 | 검증 계정 — **올해와 작년에 각각 기록이 있는** 계정. 올해 5점작이 몇 편인지 먼저 세어 둔다(4단계에서 13편을 맞춘다) | 올해/작년 비교·5점작 더보기 |
| P-4 | `npx expo start` 후 앱에서 로그인 | |

**1단계 — 지연 로딩·캐시 (데이터 변경 없음)**

| # | 동작 | 기대 | 판정 |
|---|---|---|---|
| 1-1 | 마이페이지 → 캘린더 → **리포트** → 월간만 보고 뒤로 | 백엔드 콘솔에 `/report/yearly` **없음** | 로그 |
| 1-2 | 다시 리포트 → **연간** 탭 | `/report/yearly?year=<캘린더 연도>` **1회** | 로그 |
| 1-3 | 월간 → **30초 이상 기다린 뒤** → 연간 | **재요청 없음**, 화면 즉시 표시 | 로그. ⚠️ 30초는 `staleTime` — 이걸 넘겨야 *"enabled를 탭 상태가 아니라 '한 번이라도 열었나'로 건다"*(변경 이력 10-06 ①)가 실제로 검증된다 |
| 1-4 | 연간에서 아래로 스크롤 → 월간 → 연간 | 탭을 바꿀 때마다 **맨 위**. 헤더·세그먼트는 고정 | 눈 |
| 1-5 | 화면을 나갔다 30초 뒤 다시 들어와 연간 | 재요청 **있어도 정상**(쿼리를 화면이 소유 — 재마운트) | 참고만 |

**2단계 — 화면 표시 (데이터 변경 없음)**

| # | 동작 | 기대 |
|---|---|---|
| 2-1 | **올해** 캘린더에서 연간 | 헤더 *"2026년"* + **"올해" 뱃지**. 섹션 제목 *"올해 5점을 준 작품"* · *"올해 많이 본"* |
| 2-2 | 캘린더를 **작년**으로 넘겨 연간 | 뱃지 **없음**. 제목 *"2025년에 5점을 준 작품"* · *"2025년에 많이 본"* |
| 2-3 | 섹션 순서·모양 | 요약 타일(평균 별점은 별 5개 기준) → 5점작 4열(제목 2줄) → 별점 분포 10막대(잘림 없음) → 월별 추이 **12막대, 가로 스크롤 없음, 최댓값 달만 `primary`**, x축 `1`~`12` 겹침 없음 → 관람 방식 → 많이 본 감독·배우(한 줄)·장르·국가(*"N편"*) → 요일 차트 |
| 2-4 | 5점작 포스터 탭 | 영화 상세로 이동, 뒤로 오면 리포트 그대로 |
| 2-5 | 5점작이 없는 연도 | 섹션째 숨김 |
| 2-6 | 캘린더를 **미래 월**(예: 2027년 1월)로 → 리포트 → 연간 | 400이 아니라 `EmptyState`. 세그먼트는 남아 있다 |
| 2-7 | 서재(기록·찜) 그리드 모드 | 포스터 아래 **제목이 나오지 않는다** |

**3단계 — 집계 기준 (데이터 추가)**

| # | 동작 | 기대 |
|---|---|---|
| 3-1 | 올해 5점 준 영화에 **올해, 5점 기록보다 늦은 날짜·3점**으로 재관람 기록 추가(분포는 그해 *마지막* 별점이라 날짜가 앞서면 5점이 그대로 남는다) → 리포트 연간 | 그 영화가 5점작에 **남아 있고**, 별점 분포 5점 막대는 **1 줄고** 3점 막대가 **1 는다**. 화면을 나갔다 오지 않아도 갱신(`['report']` 무효화) |
| 3-2 | **작년**에 5점 준 영화에 올해 날짜로 재관람 추가 + 그 기록을 **대표로 지정** → 캘린더 작년 → 연간 | **작년 연간이 그대로**(5점작·분포 모두) |
| 3-3 | 아무 영화에 **리뷰만** 작성 → 리포트 | 월간·연간 모두 갱신(리뷰 비율) |

**4단계 — 더보기 (데이터 추가)**

| # | 동작 | 기대 |
|---|---|---|
| 4-1 | 올해 5점작을 **13편**으로 맞춘다(P-3에서 센 수 기준으로 5점 기록 추가) → 연간 | 12편 + *"더보기 (1)"* |
| 4-2 | 더보기 → 접기 | 펼침·접힘, 백엔드 로그에 **요청 없음**. 버벅이면 기록(§9.5 — 별도 화면 이전 조건) |

**마무리** — 3·4단계에서 넣은 검증용 기록을 지운다(지울 때마다 리포트가 다시 줄어드는지도 함께 본다).
결과는 이 문서 변경 이력에 남기고, 통과하면 상위 `M2-frontend-spec.md` 진행 표의 *"실기기 검증 전"* 을 걷는다.


---

## 10. 리포트 인물 사진 (2026-10-07 확정 — 시안 D2)

감독·배우가 나오는 리포트 세 곳에 사진을 넣는다. 비교 시안은 D1(행마다 32px) · **D2(1위 강조 + 나머지 목록)** ·
D3(가로 사진 줄)이었고 **D2를 골랐다** — 리포트에서 "내 1위"가 가장 잘 드러난다. D3는 칸이 좁아 영문 인물명이
두 줄로 잘려(인물명 한글화는 출시 후로 보류) 기각했다.

### 10.1 백엔드 선행 — 계약

`cinemory-backend/docs/service-layer-spec.md` **4-8-I**. 인물 필드 4종이 `PersonRankItemResponse`
`{ id, name, profilePath, score, count }`가 된다(장르·국가는 `PreferenceItemResponse` 그대로). 백엔드 구현 후
**`gen:api`** — `api.d.ts`를 수기로 고치지 않는다.

### 10.2 공용 부품 — `PersonAvatar`

`MovieDetailScreen.tsx` 안의 `ActorAvatar`를 **`src/components/movie/PersonAvatar.tsx`로 옮기고 `size`를 받게** 한다.
상세 화면(64)과 리포트(56 · 40 · 32 · 28)가 같은 부품을 쓴다.

| 항목 | 규칙 |
|---|---|
| 이미지 | `tmdbImageUrl(profilePath, ProfileSize.LIST)` — 사이즈 하나(`w185`)로 충분하다(최대 표시 64dp) |
| 사진 없음 | `bg-muted` 원 + `UserIcon`, 아이콘 크기는 ~~`size × 0.4`~~ → **`size × 0.375`**(64 → 24로 현행과 같다. 0.4면 25.6 — 2026-10-07 구현 중 정정) |
| 모양 | 원형(`borderRadius = size / 2`) |

### 10.3 누적 리포트 — 선호 TOP의 감독·배우 (`ReportScreen`)

장르·국가 그룹은 **바꾸지 않는다**(`PreferenceGroup` 그대로). 감독·배우만 새 `PersonRankGroup`으로 그린다.

| 부분 | 내용 |
|---|---|
| 그룹 제목 | 현행과 같다(`caption`, `mutedForeground`) |
| **1위 박스** | 배경 `brandLight`(#DBF5F0), `radius.md`, 안쪽 여백 세로 10 · 가로 12. 왼쪽에 **`PersonAvatar` 56** + 오른쪽 아래에 **순위 뱃지 "1"**(22px 원, 배경 `primary`, 글자 `foreground` 굵게, 박스 배경색 2px 테두리로 사진과 분리). 오른쪽에 이름(`h4`, 한 줄 말줄임)과 그 아래 "N편"(`caption`) |
| 2위 이하 | 현행 `RankRow` 모양에 **`PersonAvatar` 28**을 순위 뱃지와 이름 사이에 넣는다. `RankRow`에 `avatarPath?: string \| null` prop을 추가한다(영화 포스터 슬롯 `movieId`/`posterPath`와 **동시에 쓰지 않는다**) |
| 개수 | **최대 3**(서버 `TOP_ACTOR_DIRECTOR_LIMIT`). 현행 `slice(0, 5)`는 인물 그룹에서 의미가 없다 |
| 1개뿐일 때 | 1위 박스만 그린다 |
| 0개 | 그룹 자체를 그리지 않는다(현행과 같다) |

⚠️ **1위 박스의 "N편"도 정렬 기준이 아니다** — 섹션 상단의 *"별점 기준 선호도 순 · 편수는 별점을 준 작품 수예요"*
문구(§5.1 3번, B안)가 그대로 1위 박스에도 적용된다. 1위가 2위보다 편수가 적을 수 있다.

### 10.4 연간·월간 — 단일 항목

| 화면 | 현재 | 바뀐 모양 |
|---|---|---|
| 연간 "올해 많이 본" 감독·배우 (`YearlyReportBody`의 `SingleItemRow`) | 라벨 · 이름 · 편수 | 라벨 · **`PersonAvatar` 40** · 이름 · 편수 |
| 월간 "이달의 기록" (`PeriodReportScreen`) | *"가장 많이 본 감독 — 이름"* 텍스트 한 줄 | **`PersonAvatar` 32** · "가장 많이 본 감독"(`caption`) · 이름(`body`) 한 행. 아래 요일 문구는 그대로 |

연간의 장르·국가(`RankGroup`)는 바꾸지 않는다. 두 화면 모두 **1위 강조는 하지 않는다** — 원래 한 명만 보여 주는 자리라
강조할 비교 대상이 없다.

### 10.5 실행 순서와 확인

1. 백엔드 4-8-I 구현·배포 확인 → 2. `gen:api` → 3. `PersonAvatar` 추출(상세 화면이 그대로 보이는지 먼저 확인) →
4. `RankRow`에 `avatarPath` → 5. `PersonRankGroup`(누적) → 6. 연간·월간 단일 항목 → 7. `tsc` · 실기기

**확인** — ① 감독·배우 각 3명 ② 1명뿐인 그룹(1위 박스만) ③ 사진 없는 인물이 1위일 때와 2위 이하일 때 ④ 영문 긴 이름이
1위 박스에서 한 줄로 말줄임되는지 ⑤ 월간·연간에서 감독이 없는 기간(행이 사라지는지) ⑥ 상세 화면 아바타(64)가 추출 전과 같은지

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-08 (이어서 3) | **`+N` 배지를 브랜드 색으로(§5.2).** 이어서 2 실기기: 스와이프 UX 회복 확인. 대신 날짜 배지와 `+N` 배지가 같은 모양(반투명 검정 + 흰 글씨)이라 헷갈린다는 피드백 → 하나만 브랜드 색으로. 날짜는 모든 칸에 있는 기본 정보라 중립색 유지, 여러 편일 때만 붙는 `+N`을 `colors.primary` 배경으로 강조. 글자는 흰색 대신 `foreground` — primary(#14D9D9) 위 흰 글씨는 대비 ~1.9:1로 13px에서 읽기 어렵고 foreground는 ~9:1. 선택 테두리도 primary지만 테두리(선) vs 배지(면)라 겹치지 않는다고 판단. `tsc` 통과, 실기기 확인 전 |
| 2026-10-08 (이어서 2) | **미리 받기 조정 — 슬라이드 종료 후 시작 · 디스크만(§5.2).** 이어서 1의 실기기 결과: 처음 보는 달 로딩은 완화됐으나 **스와이프 UX가 나빠졌다**, 빠르게 넘기면 여전히 로딩. 원인 추정 둘 — ① 받아 둔 달로 넘기면 바로 `isSuccess`라 다음 이웃의 요청·포스터 선요청이 **들어오는 슬라이드와 동시에** 시작됐고, ② `memory-disk` 선요청은 받는 즉시 최대 31장을 비트맵으로 디코드한다. → `CalendarScreen`에 `slideSettled` 상태(달 변경 시 false, 들어오는 `withTiming` 완료 콜백에서 true)를 두고 `enabled = isSuccess && slideSettled`, 선요청은 `cachePolicy: 'disk'`. 빠른 연속 스와이프의 로딩은 미리 받기 범위(±1달)와 TMDB 지연의 한계라 수용. 3달을 나란히 그리는 구조(C안)는 보류 — 스와이프 코드 재작성이라 별도 작업. `tsc` 통과, 실기기 재확인 전 |
| 2026-10-08 (이어서) | **캘린더 앞뒤 달 미리 받기(§5.2).** 포스터 칸 실기기 확인 결과 스와이프는 끊기지 않으나 **처음 보는 달은 포스터가 늦게 찼다** — 그 달 데이터 왕복 뒤에 포스터 최대 31장을 받기 시작하고, 장당 0.25~0.5s(09-27 실측, 지연 지배)라서. 지금 달이 뜬 뒤 이전 → 다음 달 순으로 데이터를 `fetchQuery`(신선하면 재요청 없음)하고 포스터를 `Image.prefetch`. ⚠️ prefetch는 취소되지 않아 무한스크롤에서 철회했던 방식(M2-frontend 09-26)이지만, 여기는 최대 62장 · 달을 넘길 때만 생겨 쌓이지 않는다. 지금 달 포스터보다 먼저 줄 서지 않게 `enabled = 지금 달 isSuccess`. `tsc` 통과, 실기기 재확인 전 |
| 2026-10-08 | **캘린더 날짜 칸 포스터 표시(§5.2·§7.2).** full 모드만 바꿨다 — compact는 칸이 32px라 포스터가 읽히지 않아 숫자 + 점 유지. 칸 높이는 09-28에 이미 폭 × 1.5(2:3)로 맞춰 둔 상태라 레이아웃 변경 없이 포스터를 채웠다. 대표 포스터는 **그날 마지막 기록**(응답이 기록 id 오름차순이라 마지막 = 가장 나중에 쓴 기록), 나머지는 `+N` 배지. 크기는 **SHELF(w185)** — 칸 폭 ~51dp × 3배 밀도 ≈ 153px이고 컬렉션 선반과 같은 크기라 이미지 캐시를 공유한다(한 달 최대 31장). 선택 표시를 원형 배경 → **칸 테두리 2px primary**로 바꾼 이유는 원이 포스터를 가리기 때문. 배지 배경은 어떤 포스터 위에서도 흰 글씨가 읽히도록 반투명 검정 `colors.scrim`(rgba 0,0,0,0.55)을 토큰에 추가. `tsc` 통과, 실기기 확인(1편 / 여러 편 +N / 포스터 없음 / 선택 테두리 / 스와이프 / 위젯 불변) 전 |
| 2026-10-07 (이어서 2) | **§10.5 ①·② 완료 — 실기기 확인(⑦)만 남음.** 백엔드 4-8-I 구현 완료(`feature/report-person-photo` 워킹 트리, 미커밋). 8080에 이미 떠 있던 서버는 **예전 코드**(스키마에 `PersonRankItemResponse` 없음)라 건드리지 않고 새 코드를 **8090에 따로 띄워** `openapi-typescript`를 그 주소로 직접 돌렸다(`npm run gen:api`와 같은 명령, URL만 다름). 차이는 계약 그대로 — `PersonRankItemResponse { id, name, profilePath, score, count }` 추가, 누적 `topDirectors`·`topActors`, 월간 `mostWatchedDirector`, 연간 `mostWatchedDirector`·`mostWatchedActor`가 이것으로 바뀜(장르·국가는 `PreferenceItemResponse` 그대로). `types/index.ts`에 별칭만 추가했고 **화면 코드는 그대로**다 — 선행 구현의 구조 타입(`PersonRankItem`)이 의도대로 받아냈다. `npx tsc --noEmit` 통과. 실값은 비로그인으로 볼 수 없어(리포트 사용자 비공개) 실기기에서 |
| 2026-10-07 (이어서) | **§10 선행 구현 — §10.5 실행 순서 3~6, 백엔드 4-8-I 구현 대기.** 인물 항목을 생성 타입이 아니라 **구조 타입 `PersonRankItem { id?, name?, count?, profilePath? }`** 으로 받아, 지금의 `PreferenceItemResponse`로도 컴파일되고 `gen:api` 후 `PersonRankItemResponse.profilePath`가 **코드 수정 없이** 흘러든다. 그래서 화면 연결까지 먼저 했고, 백엔드 전에는 사진 자리에 폴백 아이콘이 나온다(⚠️ 백엔드 반영 전에 머지하지 않는다). ③ `ActorAvatar` → `components/movie/PersonAvatar`(`size`, 상세는 64 그대로). ★ **아이콘 비율 정정** — §10.2의 `size × 0.4`는 64에서 25.6이라 *"현행 24와 같다"* 와 모순, **0.375**로 고쳤다(⑥ 상세 화면 불변). ④ `RankRow.avatarPath` — `undefined`면 슬롯 없음, `null`이면 폴백(사진 없는 인물도 자리를 차지해 이름 정렬이 맞는다). ⑤ `components/report/PersonRankGroup` — 1위 박스(`bg-brand-light`·`rounded-md`·`px-3 py-[10px]`, 56 사진 + 오른쪽 아래 22px `primary` 뱃지에 `brandLight` 2px 테두리, 이름 `h4` 한 줄 말줄임 + *"N편"*) + 2~3위 `RankRow`(28), 최대 3. `ReportScreen`의 감독·배우만 교체(장르·국가 `PreferenceGroup` 그대로). ⑥ 연간 `SingleItemRow`에 40, 월간은 응답 필드를 직접 읽으면 아직 없는 `profilePath`에 타입 에러가 나서 `MonthlyDirectorRow`(32)로 뺐다. `npx tsc --noEmit`·`expo export --platform android` 통과. **남은 것** — ① 백엔드 확인 → ② `gen:api`(별칭 `PersonRankItemResponse` 추가 정도) → ⑦ 실기기 §10.5 확인 ①~⑥ |
| 2026-10-07 | **§10 신설 — 리포트 인물 사진(시안 D2 선택).** 누적 선호 TOP의 감독·배우는 **1위 강조 박스(56px 사진 + 순위 뱃지) + 2~3위 목록(28px 사진)**, 연간 "올해 많이 본"은 40px, 월간 "이달의 기록"은 32px 사진 한 행. 장르·국가는 그대로. 상세 화면의 `ActorAvatar`를 크기를 받는 공용 `PersonAvatar`로 추출한다. 백엔드 선행: 인물 필드가 `PersonRankItemResponse`(+`profilePath`)로 바뀐다(`service-layer-spec.md` 4-8-I) → `gen:api`. ⚠️ 누적 인물 TOP은 서버 기준 **최대 3**이라 현행 `slice(0, 5)`는 인물 그룹에서 의미가 없었다 |
| 2026-10-06 (이어서 2) | **§9.7.1 실기기 검증 절차 정리.** §9.7 표를 준비(P) → 지연 로딩·캐시 → 화면 표시 → 집계 기준 → 더보기 순으로 묶었다 — 데이터를 건드리지 않는 단계를 앞에 둬 뒤 단계가 앞 단계를 오염시키지 않게. "요청 없음"은 백엔드 `DispatcherServlet` DEBUG 로그로 판정한다(`application.yml`에 요청 로그 설정이 없어 `bootRun --args`로 켠다). ★ 1-3에 **30초(`staleTime`) 대기**를 넣었다 — 그보다 빨리 왕복하면 `enabled` 설계(`이어서` ①)와 무관하게 캐시가 fresh라 재요청이 안 나, 버그가 있어도 통과해 버린다 |
| 2026-10-06 (이어서) | **§9 구현 완료 — §9.6 ①·③·④·⑥ 마무리, 실기기 검증(§9.7) 전.** 백엔드 4-8-H 완료 후 로컬 기동 → `gen:api`(차이는 연간 추가분 + 스키마 재정렬뿐, `viewerId` 누수 없음). `ReportYearlyResponse`·`FiveStarMovieResponse` 별칭, `reportApi.yearly`, `useYearlyReport(userId, year, enabled)`. 비로그인 `curl`로 응답 형태 확인 — 빈 연도는 `movieCount 0`·`averageRating null`·`monthlyTrend` 12개·`ratingDistribution` 10개로 온다(실데이터 사용자는 전부 비공개라 403, 값 확인은 실기기에서). **설계와 달라진 점 넷** — ① **`enabled`를 탭 상태가 아니라 *"한 번이라도 연간을 열었나"* 로** 건다. §9.3 예시의 `enabled = tab === 'yearly'`면 월간 → 연간 왕복에서 `enabled`가 false → true로 다시 켜지는데, 그때 캐시가 stale(`staleTime` 30초)이면 **재요청이 난다** — §9.7 *"두 번째 연간에서 재요청 없음"* 을 깬다. 같은 이유로 **쿼리는 화면(`PeriodReportScreen`)이 소유**하고 탭 본문(`YearlyReportBody`)에는 결과만 넘긴다(본문은 탭 전환 때 언마운트되므로 본문에서 구독하면 재마운트 시 stale 재요청). ② **섹션 제목의 *"올해"* 는 진행 중 연도에만** — 지난 연도에서 *"올해 5점을 준 작품"* 은 틀린 말이라 *"2025년에 5점을 준 작품"* · *"2025년에 많이 본"* 으로 쓴다. *"준"* 으로 회차 사건임을 드러낸다는 §9.4의 의도는 그대로다. ③ **헤더·세그먼트는 고정, 아래 `ScrollView`만 스크롤** — 탭 전환 시 맨 위로(`scrollTo`). 기록 0건·로딩·에러는 **탭 본문 안에서** 그려 세그먼트가 사라지지 않는다(월간도 `EmptyState`로 통일). ④ 월별 추이 x축 라벨은 **숫자만**(`1`~`12`) — 12칸 비스크롤에서 *"12월"* 은 라벨이 겹친다. 최댓값 달은 `primary`, 나머지는 `brandLight`. 많이 본 감독·배우는 순위 없이 한 줄(단일 항목), 장르·국가는 `RankRow` + *"N편"*. **정리** — `formatMinutes`·`formatStars`를 `utils/reportFormat.ts`로, 관람 방식 파이 + 미지정 과반 문구를 `components/report/WatchTypeChart`로 모아 누적·월간·연간이 함께 쓴다(누적 `ReportScreen`의 동작은 불변). `npx tsc --noEmit` 통과 |
| 2026-10-06 | **§9 구현 1단계 — 생성 타입이 필요 없는 부분만 먼저(브랜치 `feature/yearly-report`).** 스펙 점검 결과 프론트 §9 ↔ 백엔드 M3a 10절·5-8-F·`ReportYearlyResponse` DTO 사이에 어긋남이 없었다. 다만 백엔드가 **DTO만 있고 Controller·Service가 아직 없어** `gen:api`로 `ReportYearlyResponse`를 만들 수 없다(`api.d.ts` 수기 작성 금지). 그래서 §9.6 순서 중 **②·⑤와 ③의 경로·키만** 했다 — ② `MonthlyReport` → `PeriodReport` 개명(라우트 파라미터에 `initialTab?` 추가, 헤더 제목 *"이달의 리포트"* → *"리포트"*), ③ `EP.report.yearly`·`queryKeys.report.yearly`, ⑤ `MovieGridItem`에 `showTitle`(기본 false)·`posterSize` 추가 + `components/report/FiveStarGrid`(4열 `flexWrap`, `onLayout` 폭, `SHELF`, 12편 + 제자리 *"더보기 (남은 편수)"* — §9.7의 *"13편 → 더보기 (1)"* 기준). 그리드의 항목 타입은 생성 타입을 그대로 받을 수 있게 구조적으로 뒀다. **남은 것** — ① 백엔드 4-8-H 완료 후 `gen:api` → ③ `reportApi.yearly`·`useYearlyReport`·타입 별칭 → ④ 세그먼트 탭·지연 로딩 → ⑥ 나머지 섹션 → ⑦ 검증. ④에서 **월간 탭이 비어도 세그먼트는 남겨야 한다**(현재 월간 화면은 기록 0건이면 화면 전체를 빈 문구로 바꾼다 — 탭 본문 단위로 옮긴다) |
| 2026-10-05 | **§9 신설 — 연간 리포트. 9월의 *"연말 리포트는 만들지 않는다"*(§0.3·§6.4·§8)를 정정했다.** 진입은 월간과 같고(캘린더 → 리포트), 한 화면의 **월간 \| 연간 세그먼트 탭**으로 전환한다(스와이프 없음). 연도는 진입한 캘린더의 연도로 고정. ★ **`MonthlyReport` → `PeriodReport` 개명** — 두 기간을 담는 화면이 `Monthly`라는 이름이면 연간 코드가 의도를 의심받는다(백엔드도 `Monthly` → `Period`로 맞췄다). ★ **연간은 탭을 처음 누를 때만 요청**한다(`enabled`) — 쿼리 11개를 월간만 보는 사용자에게 매번 돌리지 않는다. 무효화는 `['report']` 프리픽스가 이미 덮어 추가 작업이 없다. ★ **5점작 그리드** — 포스터는 리포트에 이미 있으므로 새로 필요한 것은 셋: `MovieGridItem.showTitle`(기본 false라 서재 불변) · **`ScrollView` 안이라 `FlatList`가 아니라 `flexWrap`**(중첩 VirtualizedList 경고) · 셀 폭은 **`SectionCard` 내부 폭**을 `onLayout`으로 · `PosterSize.SHELF`. 더보기는 **제자리 펼치기**(서버가 전량을 주고 목록에 상한이 있다). ⚠️ **5점작 수와 별점 분포 5점 막대가 다를 수 있다** — 목록형(한 번이라도) vs 집계형(그해 마지막 별점)이라 제목을 *"올해 5점을 준 작품"* 으로 고정하고 비교를 유도하는 캡션을 달지 않는다. **많이 본 장르·국가·감독·배우는 편수를 보여줘도 된다** — §5.1의 금지는 score 정렬 때문이었고 여기는 편수 정렬이다. **요일은 연간에서 차트로 그린다**(1년 표본은 충분). 현재 연도 *"올해"* 판정은 클라이언트(RA-2) |
| 2026-10-02 | **§5.4 위젯 확장 + 캘린더 스와이프 + 리포트 진입 박스 — 실기기 검증 전.** ① 마이페이지 캘린더 위젯을 화면 아래 끝까지 늘려 시청 분석 리포트 박스가 스크롤해야 보이게 했다(사용자 요청) — 고정 값이 아니라 위젯 실측으로 칸 높이만 계산(`CalendarView`에 `compactCellHeight` 추가). 제목 가운데 정렬·브랜드 테두리. ② `Calendar` 상세에 좌우 스와이프 달 이동 + 미끄러지는 전환(화살표 버튼 포함). 처음에는 즉시 전환이었다가 사용자 요청으로 애니메이션을 넣고, 다시 "더 빠르게" 요청으로 220 → 140ms·활성화 20 → 12px·넘김 60 → 40px·튕김 500 → 300px/s로 조정했다(세로 포기 기준 20px은 유지 — 세로 스크롤 보호). 처음 여는 달은 데이터 대기 중 로딩 표시가 먼저 들어온다(이웃 달 선요청은 미적용). ③ 리포트 진입을 `ReportLinkCard`(브랜드 그라디언트 박스)로 공용화 — 마이페이지 시청 분석(기본 크기), 캘린더 이달의 리포트(`compact`). 시청 분석 설명 문구는 **누적 리포트**라 "이번 달" 표현을 쓰지 않는다. 커밋 `5a8a7b6`·`99c406f` |
| 2026-09-28 (이어서 8) | **별점 팔레트 4차(확정 후보) — 5.0점 = primary, 낮을수록 어둡게.** 3차(primary 명도, 낮을수록 밝게)도 아니라는 피드백 후 사용자 제안 *"5점 primary, 0.5점 deep, 사이를 섞기"* 를 **먼저 계측**했다 — `brandDeep`(#37BEB0)↔primary는 끝점 ΔE가 **8.1**뿐이라 10단계 인접 ≈0.9(`shadowDeep`으로도 3.1)로 **분간이 더 나빠진다.** 두 색 사이를 섞으면 끝점 거리만큼만 벌어진다. 대안 셋(① primary에서 낮을수록 어둡게 ② 현행 + 조각에 점수 직접 표기 ③ 제안 그대로) 중 **①을 사용자가 선택.** primary의 색상·채도 고정, OKLab 등-ΔE 배치로 **2.5~5.0점 인접 ΔE 10.0**, 0.5~2.0점은 어두운 끝(HSL 5→10%)에 압축. 방향이 바뀌어 **이제 밝을수록 높은 점수**다 |
| 2026-09-28 (이어서 7) | **별점 팔레트 3차 — primary 한 색의 명도만 조절(사용자 제안).** 2차(청록→심청 색상 이동)도 가시성이 아쉽다는 피드백. **primary(#14D9D9)의 HSL 색상 180°·채도 83%를 고정하고 명도만** 바꿨다 — 3.0점이 사실상 primary(#14D8D8), 높을수록 어둡게. 명도 값은 HSL 등간격이 아니라 **OKLab 인접 ΔE가 같도록** 골랐다(채도 높은 밝은 틴트는 지각상 압축돼 등간격이면 밝은 쪽끼리 붙는다). 2.5~5.0점 인접 **ΔE≈11.6**(2차 ≈10). 처음 계산은 밝은 끝이 거의 흰색(흰 카드 대비 1.14:1)이라 흰 간격과 함께 사라져서, 가장 밝은 사용 단계(2.5점)를 HSL 74%로 끌어내렸다. 0.5~2.0점은 밝은 끝(86→80%)에 압축 — 단계끼리 거의 같지만 드물고 범례 라벨로 구분 |
| 2026-09-28 (이어서 6) | **별점 팔레트 2차 — 비슷한 점수끼리 분간이 안 된다는 피드백.** 10단계 균등 분배로는 한 색상 계열의 명도 폭이 한계라 인접 ΔE가 ~6~7에서 막혔다(명도 폭 확대·색상 이동을 시험해도 최대 ~7.1 — 어두운 끝은 채도가 gamut에 막혀 색상 차가 잘 안 드러난다). → **명도 예산을 데이터가 몰린 구간에 쓴다**: 실측상 별점은 버킷 5~10(2.5~5.0점)에만 분포하므로(백엔드 `M3a-report-spec.md` 실측) 그 6단계에 L 0.80→0.30·청록→심청 이동으로 **인접 ΔE≈10**(dataviz 권장 ≥8 충족), 거의 안 쓰이는 0.5~2.0점 4단계는 밝은 끝(L 0.95→0.875)에 좁게 모았다(ΔE≈2.7 — 드물고 범례 라벨이 있어 감수). 명도는 전 구간 단조. 함께 **이달의 리포트 섹션명 '평점 분포' → '별점 분포'** 로 시청 분석 화면과 통일 |
| 2026-09-28 (이어서 5) | **이달의 리포트 평점 분포(도넛) 색 구분.** 모든 조각이 같은 색이라 분간이 안 된다는 피드백 — 다른 차트와 색을 공유하는 로직이 아니라, `MonthlyReportScreen`이 **모든 조각에 `colors.primary`를 넘기고 있었다**(관람 방식은 `WATCH_TYPE_REPORT_COLOR`로 구분됨). 평점은 **순서가 있는 값**이라 범주형(여러 색상)이 아니라 **순차 팔레트**로: 브랜드 색상 한 가지(OKLCH H≈195°), L 0.88→0.36 균등 하강, 낮은 점수 = 연하게. `tokens.ts`의 **`ratingScale`**(10단계, 인덱스 = 버킷 − 1)로 두고 **색은 점수에 고정**한다 — 그달 조각 수로 다시 칠하면 4.0점의 색이 달마다 바뀐다. 인접 단계 ΔE≈6이라 색만으로는 경계가 약해 **조각 사이 2px 카드색 간격**(`ReportPieChart`의 `strokeWidth`/`strokeColor`, 관람 방식 도넛에도 함께 적용)과 범례의 점수·비율 라벨을 함께 쓴다. `tsc` 통과, 실기기 확인 전 |
| 2026-09-28 (이어서 4) | **리포트 진입 시 차트 프레임 드랍 수정.** 원인: **gifted-charts의 막대 애니메이션(`isAnimated`)이 `useNativeDriver: false`** — 매 프레임 JS가 막대 높이를 계산하는데, 리포트의 막대 차트 4개(별점·월별·요일·연대)가 **화면 전환과 동시에 마운트되며 한꺼번에** 애니메이션해 JS 스레드가 포화됐다(첫 화면인 별점 분포에서 드러남). 조치 둘 — ① **`isAnimated` 제거**(네이티브 드라이버로 옮길 방법이 라이브러리에 없다) ② **차트를 native-stack `transitionEnd` 뒤에 마운트**(`ReportBarChart`에 `ready` prop, 그 전엔 `height + 30`의 빈 자리를 잡아 레이아웃이 튀지 않게). 이벤트가 오지 않는 경우를 위해 600ms 안전망. 파이 차트는 애니메이션이 없고 스크롤 아래라 그대로. `tsc` 통과, 실기기 확인 전 |
| 2026-09-28 (이어서 3) | **§5.1 3번 뒤집음 — 선호 TOP에 편수 표시(B안).** 비용 산정에서 다섯 안(A 그대로 표시 / **B 표시+정렬 기준 문구** / C 프론트 재정렬 / D 서버 정렬을 편수로 / E "많이 본 TOP" 추가)을 비교해 **사용자가 B를 선택**했다. 프론트만 바뀌며 서버·계약 변경 없다. 상세 근거(실데이터의 역전 사례, `count`가 별점 준 기록만 센다는 점)는 §5.1 3번. `tsc` 통과 |
| 2026-09-28 (이어서 2) | **캘린더 칸 높이를 포스터 비율(2:3)로.** 날짜 칸에 추후 포스터를 넣을 예정이라는 요청 — full 모드 높이를 고정 56에서 **칸 폭 × `1 / layout.posterAspectRatio`(= 1.5)** 로 바꿨다. 칸 폭은 그리드 `onLayout`으로 실측하고 첫 프레임은 `화면 폭 − screenPadding×2`로 추정한다(390dp 기기에서 칸 ~51×77, 6주 달이면 달력 ~462dp). 날짜 원·숫자는 칸 가운데 그대로 — 포스터를 넣을 때 배치(숫자를 모서리로 옮기는 등)를 다시 정한다. compact 유지. `tsc` 통과 |
| 2026-09-28 (이어서) | **캘린더 화면의 달력 확대(`CalendarView` full 모드).** 화면에 비해 작다는 피드백. 가로는 이미 화면 폭 7등분(~51dp)이라 **세로 44 → 56**(거의 정사각), 날짜 원 28 → 38, 숫자 caption → body, 기록 점 4 → 5, 요일 행 여백 `py-1` → `py-2`. 치수를 `CELL.compact`/`CELL.full` 한 표로 모아 두 모드를 한눈에 비교할 수 있게 했다. **`compact`(마이페이지 요약 위젯)는 그대로.** `tsc` 통과 |
| 2026-09-28 | **리포트 3화면 헤더 아래 빈 띠 제거.** 실기기에서 *"불필요한 툴바"* 로 보인다는 피드백 — 실제 툴바가 아니라 `Screen`의 기본 `edges`(`top` 포함)가 **네이티브 헤더가 이미 소화한 상단 안전영역을 한 번 더** 더해 생긴 빈 띠였다(M2-B에서 `MyRecords`가 먼저 밟은 것과 같은 원인). `ReportScreen`·`CalendarScreen`·`MonthlyReportScreen`의 모든 상태(로딩·에러 포함)를 `edges={['left', 'right']}`로. ⚠️ **같은 패턴이 헤더 있는 다른 화면에도 남아 있다** — `SearchResultScreen`·`SettingsScreen`·`MyPageScreen`과 컬렉션·서재 화면의 로딩/에러 상태. 이번엔 요청 범위(리포트)만 고쳤다. → 이어서 **`SearchResultScreen`도 수정**(본 화면까지 기본값이라 띠가 실제로 보였다). 나머지 화면의 로딩·에러 상태도 **로딩→본 화면 전환 때 내용이 튀는 것**을 없애려 `left/right`로 통일했다. 예외는 `_placeholder.tsx` — 헤더 없는 `AuthNavigator`에서도 쓰여 top이 필요하다. `tsc` 통과 |
| 2026-09-26 | **§7 검증 수정 1 — 별점 분포에 4.5·5.0 막대가 안 보이던 문제.** 원인은 데이터가 아니라 레이아웃: `ReportBarChart`가 막대 폭 24 + 간격 16 고정이라 10버킷이면 ≈400px로 카드 폭(폰 기준 ≈280~300px)을 넘는데, `disableScroll`이라 오른쪽 두 막대가 잘렸다. **스크롤을 켜는 안은 기각** — §4.1 "10버킷을 그대로 그린다"의 취지는 분포 형태를 한눈에 보는 것이라 스크롤하면 의미가 없다. 대신 **스크롤을 끈 차트는 `onLayout`으로 카드 폭을 재서 칸 폭 = (폭 − y축 라벨 35) ÷ 막대 수로 맞추고, 칸이 기본값(40)보다 좁을 때만 막대 60%·간격 40%로 줄인다.** 양끝 여백은 간격의 절반이라 전체 폭 = 칸 폭 × 막대 수로 정확히 들어간다. x축 라벨 폭은 gifted-charts가 막대+간격으로 잡아 자동으로 칸에 맞는다. 요일(7개)도 같은 경로를 탄다. 스크롤 차트(월별·연대)는 기존 값 유지 |
| 2026-09-23 | **§1 실행 순서 1~10번 구현 완료 — 실기기 검증(§7) 전.** 화면 셋(`ReportScreen`·`CalendarScreen`·`MonthlyReportScreen`) + 마이페이지 캘린더 요약 위젯을 `MyPageStack`에 붙였다. 설계 문서와 달랐던 점 없음 — API 파라미터·타입 별칭·무효화 매트릭스·화면 규칙(§5.1~§5.4) 전부 이 문서 그대로 반영. `react-native-gifted-charts` 설치 후 `npx expo export --platform android`로 JS 번들만으로 동작함을 확인(추가 네이티브 의존 없음). `npx tsc --noEmit` 통과. **다음은 §7 검증** — 특히 리뷰만 작성했을 때 통계 갱신(7.1-3), 캘린더 다음 달 이동 시 400 아님(7.1-5), 캘린더 요약 위젯 탭 시 재요청 없음(7.1-4, 쿼리 키 공유) 세 가지가 실기기에서 놓치기 쉬운 경로다 |
| 2026-09-22 | **M2-C2 설계 확정 — 리포트 화면 셋 + 마이페이지 캘린더 요약 위젯.** B-8이 해소돼(백엔드 M3-a 완료) M2-C §0.2에서 분리해 둔 `Report`를 연다. **진입 구조** — 시청 분석은 마이페이지 메뉴(이미 존재), 캘린더는 **마이페이지 요약 위젯**(§9.8이 `compact`를 전제로 설계돼 있었고, *"이번 달에 뭘 봤나"* 가 마이페이지에서 바로 보이는 편이 낫다), 월말은 **캘린더에서 진입**(현재 보고 있는 `year`/`month`를 그대로 넘긴다). **월말 화면에는 월 이동 UI를 두지 않는다** — 캘린더와 둘 다 두면 상태가 갈린다. ⚠️ **연말 리포트는 만들지 않는다(A안)** — 백엔드에 `/report/yearly`가 없고 `M3a-report-spec.md` 8절이 이미 범위 밖으로 확정했다. `monthlyTrend`로 흉내내는 안은 **얻는 것이 편수·회차·시간 셋뿐**이라 *"올해의 감독·장르"* 가 안 나와 기각했다. **한 화면 스크롤**로 가고 섹션 분할은 로딩이 실제 문제가 될 때 논의한다(백엔드 5-8의 C안 재검토 조건이 그 자리다). ★ **요일 매핑을 1-based 배열로 고정** — `DAYOFWEEK()`(1=일)·`getDay()`(0=일)·캘린더 헤더 셋의 **오프셋이 달라** 오프바이원이 나기 쉬운데, `['', '일', …]`로 0번을 비우면 **서버 값을 변환 없이 인덱싱**해 구조적으로 막힌다. 월요일 시작 재배열은 **같은 흐름의 캘린더가 일요일 시작이라** 기각. ★ **`reviewRate`를 비율로 쓰지 않는다** — 리뷰는 기록 없이도 쓸 수 있어 **1.0을 넘을 수 있고**(기록 2편에 리뷰 3개 → "150%"), 두 숫자(*"135편 중 42편에 리뷰"*)면 분모 설명도 필요 없다. ★ **무효화에 리뷰를 포함**했다 — `reviewRate` 때문에 **기록을 건드리지 않고 리뷰만 써도 통계가 바뀐다.** 반대로 **찜은 리포트에 영향이 없어** 습관적으로 넣지 않도록 명시했다. 화면 규칙은 백엔드 `M3a-report-spec.md` 7절에서 가져왔다 — 날짜 미상 표기 · 선호 카드에 편수 쓰지 않기 · 미지정 과반 시 유도 문구 · 10버킷 그대로 받기 |
