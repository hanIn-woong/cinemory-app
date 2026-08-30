# CineMory 기획 노트

> 사용자의 영화 시청 기록과 분석에 기반한 영화 추천 및 상영 정보 제공 애플리케이션
> 최종 갱신일: 2026-08-27
> ※ **새 세션 시작 지점** — M2(프론트)는 **4-M2절**, M3(리포트·추천)는 **4-M3절**부터 읽을 것.
> ※ 실서버 배포·인프라 구성은 **4-INF절** (배포 트리거·구성 A안·전환 비용).
> ※ 본 문서는 최종 확정 사항만 기록합니다. 변경 히스토리·의사결정 과정은 DevLog.md 참고.

---

## 1. 프로젝트 개요

- **목표**: 개인 시청 기록 관리 + 시청 분석 리포트 + 영화 추천(임베딩 기반) + 소셜 + CineMap(상영관 위치)
- **기술 스택**: React Native (Expo, TypeScript) / Spring Boot + MySQL + JPA / TMDB API / KOFIC KOBIS Open API / 전국영화상영관표준데이터

---

## 2. 최종 데이터베이스 설계 (현행 v10, 22개 테이블 — 아래 표는 v8 기준 원문)

### 2-1. 전체 테이블 구성

| 분류 | 테이블 | 역할 |
|---|---|---|
| 사용자 | `user` | 로컬/소셜 로그인 통합. `privacy_setting`으로 공개 범위 관리 |
| 영화 메타데이터 | `movie` | TMDB + KOFIC 연동 (`tmdb_id`, `kofic_movie_cd` 이중 식별자) |
| | `genre`, `movie_genre` | 장르 N:M 매핑. `movie_genre.weight`(1/N)로 선호 장르 집계 |
| | `country`, `movie_country` | 제작국가 N:M 매핑. `movie_country.weight`((N+1)/(N²+1))로 선호 국가 집계 |
| | `person`, `movie_actor`, `movie_director` | 인물 N:M 매핑. 배우/감독 테이블 분리. `movie_actor.role_tier`(LEAD/SUPPORTING/MINOR)로 선호 배우 집계 |
| 사용자 기록 | `watch_record` | 회차별 시청 기록. `is_representative`로 대표 기록 지정. `watch_type`/`place_detail`/`ott_platform_id`로 시청 장소 기록 |
| | `review` | 영화당 공개 대표 리뷰 1개. 시청 기록 없이도 작성 가능 |
| | `wish_movie` | 위시리스트 |
| | `collection`, `collection_movie` | 사용자 정의 영화 컬렉션 |
| OTT | `ott_platform` | OTT 서비스 참조 테이블. `is_active`로 서비스 종료 관리. 향후 `movie_ott`, `user_ott` 확장 예정 |
| 소셜 | `follow` | 유저 간 팔로우. 자기 팔로우 CHECK 제약 |
| | `comment` | `collection`/`review` 대상 다형성 댓글 |
| CineMap/박스오피스 | `theater` | 전국영화상영관표준데이터 기반 극장 위치 |
| | `box_office_record` | KOFIC 일별/주간/주말 박스오피스. `movie_id` nullable FK(`SET NULL`) |

### 2-2. `user` 테이블

- 로컬 회원가입과 소셜 로그인(OAuth)을 한 테이블에서 처리
- `password_hash`, `provider`/`provider_id` 상호배타 CHECK 제약:
  ```sql
  CHECK ((provider IS NULL AND password_hash IS NOT NULL)
      OR (provider IS NOT NULL AND password_hash IS NULL))
  ```
- `(provider, provider_id)` 복합 UNIQUE
- `privacy_setting ENUM('PRIVATE','FRIENDS','PUBLIC')`

### 2-3. `watch_record` vs `review`

| 구분 | `watch_record` | `review` |
|---|---|---|
| 성격 | 개인적 시청 기록 (회차별) | 공개 대표 리뷰 |
| 개수 제약 | 유저×영화 여러 개 허용 | 유저×영화당 정확히 1개 (`UNIQUE(user_id, movie_id)`) |
| `watch_date` | nullable | 없음 |
| 작성 조건 | 시청 사실 자체가 곧 기록 | 시청 기록 없이도 작성 가능 |

**대표 시청 기록 판단 기준**: `id`(AUTO_INCREMENT) 기준
```sql
SELECT * FROM watch_record WHERE user_id=? AND movie_id=? ORDER BY id DESC LIMIT 1;
```

**시청 횟수 / 회차 번호**: 컬럼 저장 없이 조회 시점 계산
```sql
SELECT COUNT(*) FROM watch_record WHERE user_id = ? AND movie_id = ?;
ROW_NUMBER() OVER (PARTITION BY user_id, movie_id ORDER BY id)
```

### 2-4. 시청 분석 리포트 가중치 설계

리포트 집계 시 곱해지는 평점은 `review.rating`(공개 대표 평점) 기준.

**제작국가 — `movie_country.weight`**
```
1위(대표) = (N+1) / (N²+1)
나머지 각각 = N / (N²+1)
```

**장르 — `movie_genre.weight`**: `1/N` 균등분배

**출연진 — `movie_actor.role_tier`**
```
order / 전체 출연진 수 기준 상위 비율 → LEAD / SUPPORTING / MINOR
```
- 등급별 가중치: **LEAD 0.5 : SUPPORTING 0.4 : MINOR 0.1** (애플리케이션 코드 상수(Enum)로 관리, DB 참조 테이블 아님)
- 경계 비율 수치는 미확정 — 실데이터로 추후 튜닝

**리포트 집계 쿼리 패턴** (선호 장르 예시, 국가/배우도 동일 패턴)
```sql
SELECT g.name, SUM(r.rating * mg.weight) AS score
FROM review r
JOIN movie_genre mg ON r.movie_id = mg.movie_id
JOIN genre g ON mg.genre_id = g.id
WHERE r.user_id = ?
GROUP BY g.id ORDER BY score DESC;
```

### 2-5. 인물 테이블 구조

- `movie_actor`, `movie_director` 분리 (단일 `movie_person` 테이블 아님)
- `movie_actor.role_tier`는 `NOT NULL`
- `movie_director`에는 역할 등급 컬럼 없음
- 트레이드오프: 배우+감독 겸업 이력 조회 시 두 테이블 별도 조회 필요 (현재 계획엔 없는 기능)

### 2-6. FK `ON DELETE` 정책

| 참조 방향 | 정책 |
|---|---|
| `watch_record`/`wish_movie`/`review`/`collection_movie` → `movie` | `RESTRICT` |
| `movie_genre`/`movie_country`/`movie_actor`/`movie_director` → `movie` | `CASCADE` |
| 모든 테이블 → `user` | `CASCADE` |

### 2-7. 네이밍/스타일 규칙

- 제약조건: `fk_`, `uk_`, `idx_` 접두사 + 소문자, `{테이블}_{컬럼}` 패턴
- 복합 인덱스는 컬럼 나열 방식으로 통일
- 한글 COMMENT 없음, COLLATE `utf8mb4_0900_ai_ci` 통일

---

## 3. 백엔드 구현 고려사항

### (1) TMDB 데이터 동기화 배치 — 계산이 필요한 값

| 컬럼 | 계산 방식 |
|---|---|
| `movie_genre.weight` | `1 / 해당 영화 장르 수(N)` |
| `movie_country.weight` | 1위: `(N+1)/(N²+1)`, 나머지: `N/(N²+1)` |
| `movie_actor.role_tier` | `order / 전체 출연진 수` 상대 비율 기준 분류 (경계값 미확정) |

### (2) TMDB ↔ KOFIC 영화 매칭

```
1순위: kofic_movie_cd로 movie.kofic_movie_cd 직접 매칭
2순위: 한글 제목 + 개봉연도 fuzzy 매칭
3순위: 매칭 실패 → movie_id = NULL 유지
```

### (3) 대표 시청 기록 관리 (`is_representative`)

- 새 `watch_record` INSERT 시 기존 `is_representative=TRUE` row를 `FALSE`로 변경 후 새 row를 `TRUE`로 설정 — `@Transactional` 원자적 처리 필수
- 수동 지정 시에도 동일한 트랜잭션 패턴 적용

### (4) OTT 플랫폼 확장 대비

| 예정 기능 | 필요 테이블 |
|---|---|
| 영화별 OTT 서비스 여부 | `movie_ott` (movie ↔ ott_platform N:M) |
| 사용자 OTT 구독 정보 | `user_ott` (user ↔ ott_platform N:M) |
| 구독 OTT 기반 필터링/추천 | 위 두 테이블 JOIN |

### (5) CineMap 구현 주의사항

- 극장 좌표계: `EPSG:5174` → `theater.latitude/longitude`(WGS84) 변환 필수 (수집 배치에서 처리)
- "현재 상영 중" 표시: KOFIC 일별 박스오피스에 오늘 집계된 영화로 근사
- 예매 연결: 극장 마커 탭 → CGV/롯데시네마/메가박스 예매 페이지 딥링크 (상영시간표 API 공식 경로 없음)

### (6) comment 다형성 처리

`comment.target_type`이 `COLLECTION`이면 `target_id` → `collection.id`, `REVIEW`면 `target_id` → `review.id`. DB FK 미적용, Service 레이어에서 검증 필수.

```java
void validateTarget(String targetType, Long targetId);
```

---

## 4. 전체 마일스톤 (2026-08-23 갱신)

> 초판(2026-06-19)은 **기능 단위 5단계** 로드맵이었으나, 실제 진행은 **백엔드 계층 단위**로
> 이뤄졌다(엔티티 → Repository/Service → Security → Controller). 아래는 실제 진행 상황과
> 남은 작업을 기준으로 다시 정리한 것이다.

### 완료 — 백엔드 기반 (Step1 ~ Step5 + Step S)

| Step | 범위 | 산출물 |
|---|---|---|
| Step1~3 | JPA 엔티티 설계·구현 (22 테이블, 스키마 v10) | `docs/jpa-entity-spec.md` |
| Step4 | Repository / Service 계층 (4-0 ~ 4-7) | `docs/service-layer-spec.md` |
| Step S | Spring Security — JWT·카카오 로그인·비밀번호 재설정 | `docs/security-spec.md` |
| Step5 | Controller 계층 (5-0 ~ 5-7) | `docs/controller-layer-spec.md` |

**현재 상태** — 컨트롤러 12개, 테스트 클래스 15개. 인증·인가·공개범위·예외 포맷·OpenAPI 문서화까지 완료.

> 초판 로드맵과의 대응: 2단계(영화 기록)·4단계(맵/컬렉션)·5단계(소셜)의 **백엔드 API는 모두 구현됨.**
> 남은 것은 **데이터를 채우는 경로(M1), 프론트엔드(M2), 추천(M3), 알림(M4)** 이다.

---

### ✅ M1 — TMDB 연동 (Step6) · **완료** (2026-08-24 기준)

> **설계 6-0~6-9 전부 확정, 구현 6-1~6-9 완료, 본 시드 4,609편 적재 완료.**
> 진실의 원천은 `docs/tmdb-sync-spec.md`다.
>
> | 항목 | 상태 |
> |---|---|
> | 6-0 미결 4건 (D-1 `role_tier` / D-2 적재 전략 / D-3 대표국 / D-4 overview) | ✅ 확정 |
> | 6-1~6-6 (참조 적재 · `TmdbClient` · 매핑 · `MovieSyncService` · 시드 · ErrorCode) | ✅ 구현 |
> | 6-7 최초 시드 실측 (60편) — 잔여 #4·#8·#11 판정 | ✅ |
> | 6-8 영화 검색 (`GET /api/movies/search`) | ✅ 구현 |
> | 6-9 `movie` 메타데이터 보강 + `POST /api/admin/movies/resync` | ✅ 구현 |
> | **6-7-b 본 시드 실측 (4,609편)** — 잔여 #8·#10·#11 종결 | ✅ |
> | 스키마 v11 → v12 → v13 → v14 | ✅ 적용·`cinemory_backup_v14.sql` 재덤프 완료 |
>
> **데이터 현황** — `movie` 4,609 / `movie_actor` 186,717 / `person` 113,909 / `box_office_record` 140.
>
> ✅ **잔여 #10이 닫혔다** — 박스오피스 140건 중 127건 매칭(**90.7%**).
> 8건뿐이라 검증되지 않던 **D-2의 역방향 시드 주 경로 선택이 처음으로 실측으로 뒷받침됐다.**
>
> ⚠️ **M2 착수 전 남은 코드 작업 1건 — tmdb-sync 잔여 #27.**
> v14로 `character_name` 컬럼은 255로 넓혔으나 **엔티티 `@Column(length)`와
> `MovieSyncPersister.CHARACTER_NAME_MAX_LENGTH`가 아직 100**이다. `ddl-auto=validate`는
> **길이를 검증하지 않아** 기동이 통과하고 절단만 조용히 계속된다. 고친 뒤 **이미 잘린 29건은
> `resync`로 재적재**해야 하며, v13 이전 60편의 신규 컬럼 NULL 보정과 한 번에 해소된다.

<details>
<summary>M1 착수 당시 배경 (2026-08-11 기록, 보존용)</summary>

**`movie` 테이블을 채울 경로가 현재 하나도 없다.** 4-2에서 `MovieSyncService`를 시그니처만
확정하고 "별도 세션에서 구현"으로 미뤘는데 그 세션이 열리지 않았고, 유일하게 TMDB를 호출하던
`TestController`는 S-9 A-7로 삭제됐다. `global/infra`에 `kakao`/`kofic`/`mail`은 있으나 `tmdb`가 없다.

**이것이 없으면 앱이 동작하지 않는다.**

| 영향 | 내용 |
|---|---|
| 사용자 기능 전부 | 시청기록·위시·컬렉션·리뷰가 모두 `movie` FK를 요구 |
| 박스오피스 | 1순위 매칭(`koficMovieCd`) 대상이 없어 수집분이 전부 `movie_id = NULL`로 적재됨 |
| 추천(M3) | 임베딩 입력이 `movie_genre`/`movie_country`/`movie_actor` 가중치 |
| 프론트(M2) | 실데이터 없이는 화면 검증 불가 |

**착수 전 확정이 필요한 항목** (코드 세션 전에 `docs/tmdb-sync-spec.md` 선행)

- `syncCountries` 가중치 공식 `(N+1)/(N²+1)` 적용 방식
- **`movie_actor.role_tier` 경계값** — 8번 미결 사항. 미정 상태로 넘기면 임의로 정해진다
- 초기 적재 전략 — 인기작 N편 시드 vs 검색 시 온디맨드 동기화
- `TmdbClient`는 `global/infra/tmdb`에 KOFIC과 동일 골격으로(4-7에서 예고됨)

</details>

### 🟠 M2 — 프론트엔드 (React Native / Expo) · **최우선**

API 표면이 확정됐고 `/v3/api-docs`에서 TS 타입 생성이 검증됐으므로 **지금이 착수 적기**다.
목 데이터로 시작해 M1 완료 시 실데이터로 전환한다.

- 초판 1단계의 "Expo 세팅·네비게이션 구조"부터 — 바텀탭 구조는 API 형태 확정 대기로 미뤄뒀던 항목
- `openapi-typescript`(또는 `orval`)로 타입·클라이언트 생성
- 초판 2단계(영화 기록)·4단계(맵·컬렉션) 화면

> **일정 리스크가 가장 큰 구간이다.** 백엔드는 촘촘하게 쌓였지만 프론트는 0에서 시작이라,
> M1 완료까지 미루면 뒤가 눌린다. 병렬 진행을 전제로 잡는다.

> #### ⚠️ 2026-08-23 중간 점검 — 위 경고가 현실이 됐다
>
> **8/11에 "병렬 진행을 전제로 잡는다"고 적었으나 12일이 지난 지금도 M2는 0%다.**
> 방학 4주(7/22~8/20)가 전부 백엔드로 갔다. 백엔드 품질은 높지만 그 시간이 프론트에서 나왔다.
>
> **속도 자체는 문제가 아니다** — 실질 개발 30일에 엔티티 22개·Security·컨트롤러 12개·
> TMDB 연동까지 끝냈다. 문제는 **배분**이다.
>
> | 근거 | 값 |
> |---|---|
> | 실질 개발 기간 | 2026-07-22 ~ 08-20 (약 30일, 커밋 15개) |
> | 현재 데모 가능한 것 | **Swagger UI뿐** — 사용자가 볼 화면이 0 |
> | 발표 | **11월 중** |
> | 개강 후 가용 시간 | 방학 대비 **절반 이하로 보는 것이 안전** |
>
> **9월 둘째 주부터 프론트에 집중하면 약 10주가 남는다.** 0에서 시작하는 RN 앱치고
> 넉넉하지 않으므로 **화면 우선순위를 지키는 것이 중요하다**(아래 4-M2절).

### 🟡 M3 — 리포트 + 추천 (초판 3단계 ⭐)

> **⚠️ M3는 사실 두 덩어리이고 준비 상태가 전혀 다르다.** 한 마일스톤으로 묶어두면
> "설계 미착수"로 뭉뚱그려져 **이미 할 수 있는 절반이 가려진다.**

| 덩어리 | 설계 상태 | 비고 |
|---|---|---|
| **M3-a 리포트** (통계·캘린더·월말/연말 결산) | ✅ **설계 완료** — 2-4절에 가중치 공식과 집계 쿼리 패턴까지 | SQL 집계만으로 구현 가능 |
| **M3-b 추천** (키워드·자연어 기반) | ❌ **백지** — 임베딩 저장 위치조차 미결정 | 확정 4건 선행 (아래 4-M3) |

**→ 리포트를 먼저 한다.** 리포트("당신의 선호 장르 TOP 5")가 동작하면 **그 집계 결과가 곧
추천의 입력**이므로 R-1(입력 소스)이 실데이터로 검증되고, 그 위에 추천을 얹으면 된다.
임베딩 미결정에 막히지도 않는다. 데모 관점에서도 리포트가 화면이 잘 나온다.

**M1이 M3의 입력을 이미 완성해 뒀다** — 준비 상태와 확정 필요 항목은 **4-M3절** 참고.

### 🟢 M4 — 알림 도메인

엔티티 3개(`Notification`/`NotificationType`/`NotificationTargetType`)만 존재하고
Repository·Service·Controller 전부 미착수. **큰 덩어리 중 유일하게 뒤로 미룰 수 있다.**

- 알림 생성 지점이 `FollowService.follow()` / `CommentService.createComment()` 안에 들어간다
- ⚠️ `comment`와 동일한 다형 참조라 **고아 알림 문제가 재현된다.** `deleteCollection()` /
  `deleteReview()`에서 댓글을 정리하는 바로 그 자리에 알림 정리도 넣어야 한다

### ⚫ M5 — 출시 준비 (초판 5단계)

- `docs/security-spec.md` S-11 *"배포 전 반드시 처리할 것"* 전체
- 운영 프로파일에서 Swagger UI 차단 확인
- 미검증 E2E — ~~카카오 실토큰~~ ✅ **2026-08-27 통과**(웹 플로우, `aud`=REST API 키.
  **네이티브 앱 키의 `aud`는 여전히 미검증** — L-7), **실제 SMTP 발송**은 남음
- 아래 Expo/EAS 출시 절차

> ⚠️ **실서버 배포는 M5까지 미루지 않는다.** 배포 시점·구성은 **4-INF절**에 별도로 정리돼 있고,
> 트리거는 **M2의 카카오 로그인**(대략 9월 중순)이다. M5는 그 위에서 하는 *출시* 준비다.
> S-11의 **L-10·L-11은 8월 말 선행 처리** 대상이라 M5를 기다리면 안 된다.

---

### 상시 잔여 항목

`docs/controller-layer-spec.md`의 "잔여 확인 항목" 표를 단일 출처로 삼는다.
마일스톤에 묶이지 않는 소소한 것들(`searchMovies` 노출, `TheaterSeedService` 입력 방식 +
좌표계 확인, `spring-boot-starter-web` → `webmvc` 리네임 등)이 거기 정리돼 있다.

---

#### 참고 — 소셜 API (초판 초안, **현행 아님**)

초판에 적어둔 아래 초안은 실제 구현과 경로가 다르다.
**현행 API 표면은 `docs/controller-layer-spec.md`가 단일 출처다.**

```
ENUM visibility: PRIVATE | FRIENDS | PUBLIC   ← FRIENDS = 상호 팔로우로 확정(4-6)

GET    /api/users/{userId}/records
GET    /api/users/{userId}/collections
POST   /api/comments
GET    /api/comments?targetType=&targetId=    ← 초판의 경로변수 방식에서 변경됨
DELETE /api/comments/{commentId}
```

#### M5 상세 — 출시 절차 (Expo/EAS 기준)
1. `eas build:configure`
2. app.json 확인 (package명, versionCode, permissions: ACCESS_FINE_LOCATION, INTERNET)
3. `eas build --platform android --profile production`
4. Play Console 수동 업로드

**Play Console 준비물**: 개발자 계정 등록비 $25, 앱 아이콘 512×512px, 피처드 이미지 1024×500px, 스크린샷 최소 2장, 개인정보처리방침 URL

**iOS 출시는 후순위** (Android 우선 출시 후 대응)

---

## 4-M2. M2 착수 인수인계 (2026-08-23 작성)

> **이 절은 새 세션이 컨텍스트 없이 M2를 시작할 수 있도록 쓴 것이다.**
> 먼저 이 절을 읽고, 필요하면 아래 "읽을 문서"로 내려가면 된다.

### 선행 — 8월 마지막 주에 끝낼 것 (백엔드) · **거의 완료 (2026-08-24)**

프론트 착수 전에 **비어 있으면 첫 주에 막히는 것**들이다.

| # | 작업 | 성격 | 상태 |
|---|---|---|---|
| 1 | **6-8 검색 구현** (`GET /api/movies/search`) | 코드. 설계는 `tmdb-sync-spec.md` 6-8에 확정돼 있다 | ✅ 완료 |
| 2 | 박스오피스 며칠치 수집 → 역방향 시드 → 재매칭 | **실행만.** 잔여 #10이 함께 닫힌다 | ✅ 140건 수집·127건 매칭(90.7%), **#10 종결** |
| 3 | `discover` 시드 | **실행만.** M3 추천 품질이 데이터 규모에 직접 종속된다 | ✅ **4,609편** (목표 5,000, 중복분 제외) |
| 4 | `DevLog.md` · 본 노트 갱신 | M1 종료 선언 | 🔲 `DevLog.md` 남음 |
| 5 | ~~잔여 #27 — v14 코드 반영 후 `resync`~~ | 코드 2줄 + 실행 | ✅ 완료 (2026-08-27, 4,587건 갱신) |
| 6 | **`security-spec.md` L-10·L-11** | 설정. 배포를 기다리지 않는다 (4-INF) | 🔲 |
| 7 | ~~카카오 실토큰 로컬 검증~~ | `docs/kakao-login-runbook.md` 절차대로 1회 | ✅ **성공** (2026-08-27) — 서명·`iss`·`aud`·`nonce` 4종 통과. ⚠️ 잔여 2건은 아래 |

⚠️ **7번을 지금 해두는 이유 — 미지수를 한 시점에 몰지 않기 위해서다.**
`security-spec.md` 미검증 E2E 2건 중 하나가 **카카오 실토큰**인데, 이게 지금 구조상
**배포 트리거와 정확히 같은 시점에 온다**(4-INF). 9월 중순에 *"카카오 로그인 처음 붙이기 +
실토큰 처음 검증 + 실서버 처음 올리기 + redirect URI 처음 등록"* 이 한꺼번에 겹치면
문제가 생겼을 때 **어느 층인지 가려내기 어렵다.** 로컬에서 실토큰을 한 번 통과시켜 두면
배포 시점엔 redirect URI와 HTTPS만 남는다 — **미지수가 넷에서 둘로 준다.**

> ✅ **2026-08-27 완료.** 판단이 맞았다 — 통과까지 **`client_secret` 누락(401) → `aud` 불일치
> → nonce 만료** 세 단계를 거쳤다. **이걸 9월 중순에 배포·redirect URI 문제와 뒤섞어 만났다면
> 원인 분리가 훨씬 어려웠을 것이다.**
>
> ⚠️ **M2에서 남는 것 2건**
>
> 1. **네이티브 앱 키의 `aud`** — 통과한 `aud`는 **REST API 키**다. RN에서 카카오 SDK로 로그인하면
>    `aud`가 네이티브 앱 키로 바뀌어 **똑같은 `INVALID_OAUTH_TOKEN`을 만난다.**
>    `oauth.kakao.allowed-audiences`가 목록이라 **한 줄 추가**로 끝난다(교체 아님).
> 2. **실기기 redirect URI · HTTPS** — 배포 시점 항목(4-INF)
>
> ⚠️ **검증용으로 늘린 `auth.oauth.nonce-ttl`을 `PT5M`으로 되돌릴 것.**

> 2·3번은 애초 계획(2주치 박스오피스 + `pages=100` 약 2,000편)보다 규모를 키워 실행했다.
> 5,000편으로 늘린 근거와 프로필 구성은 `tmdb-sync-spec.md` 6-5, 실행 절차는
> `docs/movie-seed-runbook.md`에 있다.

**왜 검색이 하드 블로커인가** — 없으면 사용자가 영화를 고를 방법이 `GET /api/movies`
전체 목록뿐이다. **시청기록·위시·리뷰·컬렉션이 전부 "영화 고르기"에서 시작**하므로
앱의 핵심 동선이 성립하지 않는다.

✅ **잔여 #8(인덱스) 재확인 완료 — 인덱스 추가 불필요.** 여기서 우려했던 대로 확인했고,
`movie_actor`가 2,375 → **186,717행(79배)** 이 되는 동안 `EXPLAIN`의 `rows`는 **141 그대로**였다
(`type=ref`, `key=uk_movie_actor`). 비용을 정하는 것은 **테이블 크기가 아니라 매칭 행 수**라는
원래 판정 근거가 실측으로 확인된 것이다.

### 화면 우선순위 — 9개를 다 만들면 11월까지 못 끝낸다

6절 `screens/`에 9개 디렉터리가 있다. 핵심 동선은
**로그인 → 검색 → 기록 → 내 기록 목록**이고, 이는 앱의 정체성이자 **백엔드가 완비된 부분**이다.

| 군 | 시기 | 화면 |
|---|---|---|
| **1군** | 9월 | `mypage`(로그인) · `search` · `records` · `home` |
| 2군 | 10월 | `wishlist` · `collection` · `report` |
| 3군 | 여유 시 | `social` · `cinemap` · `recommend` |

- `report`가 2군인 이유 — **M3-a는 설계가 이미 있고 SQL 집계만으로 된다.** 화면이 잘 나와
  데모 가치가 높다.
- `cinemap`이 3군인 이유 — `GET /api/theaters/nearby`는 구현됐지만 **`TheaterSeedService`를
  호출할 엔드포인트가 없어 `theater` 테이블이 비어 있다**(controller 잔여 #5, 좌표계 확인 보류).
  지금 만들면 빈 지도가 나온다.
- `recommend`가 3군인 이유 — M3-b 설계가 백지다. 4-M3절의 R-2에서 규칙 기반을 택하면
  화면이 단순해지므로 10월에 재배치한다.

### 백엔드 API 표면 — 검색 외에는 완비

인증 9 · 시청기록 5 · 리뷰 4 · 위시 3 · 컬렉션 7 · 댓글 4 · 팔로우 4 · 프로필 5 · 박스오피스 1 ·
영화 3(목록/상세/출연진) · 극장 1. **알림(M4)만 통째로 없다.**

- 타입 생성은 `openapi-typescript`로 `/v3/api-docs`에서 — **5-7 B에서 이미 검증된 경로**다
- 레포는 `cinemory-app`으로 분리 (5절 브랜치 전략)
- 폴더 구조는 6절 그대로

### M2 진행 중 마주칠 결정 지점 (2026-08-27 점검)

**하드 블로커는 없다.** 영화 엔드포인트 4종(`GET /api/movies` · `/search` · `/{id}` ·
`/{id}/cast`)과 `POST /api/movies/sync` 실재 확인, 컨트롤러 16개, **CORS는 이미 설정돼 있고
`cinemory.cors.allowed-origins`로 외부화**돼 있다(Expo origin 추가가 설정 한 줄이고 배포 때도 그대로 쓴다).

아래는 막는 것이 아니라 **특정 순간에 걸리는 것**들이다. 시점 순서대로다.

| 언제 | 무엇 |
|---|---|
| 레포 만들 때 | **`cinemory-app`이 아직 없다** (현재 백엔드 폴더만) |
| 화면 붙이자마자 | **이미지 베이스 URL** — 코드에 없다(의도적으로 프론트 몫, tmdb-sync 6-3). **상수 한 곳**으로 둘 것. 사이즈(`w185` 목록 / `w500` 상세)도 거기서 고른다. 화면마다 문자열을 조립하면 정책 변경 때 전부 찾아다녀야 한다. TMDB 출처 표기 요건도 함께 확인 |
| 라우팅 짤 때 | **컬렉션 단건 조회 Service 부재** (`controller-layer-spec.md` 잔여 #4). 딥링크를 쓰면 필요해진다 |
| 상세 화면 | **평점 표시 미구현** (tmdb-sync 잔여 #24) — `MovieDetailResponse`에 평점 필드가 없다. TMDB 평점(v13 `voteAverage`)과 우리 평점(`AVG(rating)` 집계)을 함께 보여주는 설계 |
| **업로드 붙이기 전** | ⚠️ **`user.profile_image` 저장 위치** (`security-spec.md` **L-13**). **되돌리기가 가장 비싼 결정**이다 — 로컬 디스크에 두면 나중에 코드 + 데이터 이전 + URL 일괄 갱신이 붙는다. 기능을 만들기 **전에** 정할 것 |

### 알아둘 함정

- **박스오피스 응답의 `posterPath`·`movieId`는 `movie`가 매칭됐을 때만 채워진다.**
  `BoxOfficeItemResponse`가 `movie != null`을 확인한다. 재매칭 전이면 제목만 나온다.
- **영화 상세의 출연진은 `displayOrder <= 20`만 온다.** 전체는 `GET /api/movies/{id}/cast`(페이징).
- **인물명의 약 71%가 영문이다.** TMDB의 한글화 커버리지 한계이며 우리 버그가 아니다
  (tmdb-sync 6-7, 잔여 #19). 화면에서 어색하면 그때 판단한다.
- 검색 응답은 `{registered, suggestions}` **2섹션**이다. `suggestions`는 미등록 영화라
  `movieId`가 없고, 선택 시 `POST /api/movies/sync`로 등록해야 `movieId`가 생긴다.

---

## 4-M3. M3 착수 인수인계 (2026-08-23 작성)

> **이 절도 새 세션이 컨텍스트 없이 시작할 수 있도록 쓴 것이다.**
> M3는 **M3-a 리포트**와 **M3-b 추천**으로 나뉜다(4절 참고). **리포트를 먼저 한다.**

### 이미 준비된 것 — M1이 M3의 입력을 완성해 뒀다

| 데이터 | 상태 | 근거 |
|---|---|---|
| `movie_genre.weight` (`1/N`) | ✅ 적재 | tmdb-sync 6-3 |
| `movie_country.weight` (`(N+1)/(N²+1)`) | ✅ 적재. 대표국 판정 포함 | **D-3** |
| `movie_actor.role_tier` + `RoleTier.weight` | ✅ 적재 | **D-1** |
| 집계 쿼리 패턴 | ✅ 본 노트 **2-4절** | — |

> **D-1이 M3를 위한 작업이었다.** 배우 가중치를 절대 순번(`0~4 LEAD` / `5~9 SUPPORTING` /
> `10~20 MINOR` / `21~ EXTRA(0.0)`)으로 정하면서 **영화당 배우 선호 기여 총점이 출연진 수와
> 무관하게 5.6으로 고정**됐다. 이게 없었으면 출연진 200명짜리 영화가 선호 배우 집계를
> 통째로 왜곡했을 것이다.

### 설계 세션 전에 확정할 것 4건

6-0의 D-1~D-4와 같은 성격이다. **미정으로 넘기면 임의값이 박힌다.**

**R-1. 선호도 산출의 입력이 무엇인가**

2-4절의 쿼리는 `FROM review r`인데, **사용자는 평점 없이 시청기록만 남기는 경우가 훨씬 많다.**
`watch_record`에도 `rating`이 있으나(nullable) 쓰이지 않고, `wish_movie`는 "보고 싶다"는
명확한 선호 신호인데 빠져 있다.

- `review`만? `watch_record`도? **평점 없는 기록은 가중치를 얼마로 칠 것인가**
- 위시를 선호 신호로 볼 것인가 — 본 적은 없지만 취향은 드러난다

**R-2. "추천"의 정의** ← *가장 큰 갈림길*

| 방식 | 비용 | 준비 상태 |
|---|---|---|
| **규칙 기반** (선호 장르·배우 상위 → 미시청작 매칭) | 낮음 | **입력 데이터 완비** |
| 임베딩 유사도 | 높음 | 저장 위치 미결, 벡터 생성 방식 미설계 |

> **캡스톤 잔여 기간을 고려하면 규칙 기반으로 시작하고 임베딩은 여유가 있으면 얹는 편이
> 안전하다.** 차별화 서사는 유지된다. **R-2에서 규칙 기반을 택하면 R-4가 통째로 사라진다.**

**R-3. 콜드 스타트** — 기록이 없는 신규 사용자에게 무엇을 보여줄 것인가.
박스오피스·인기작 폴백이 자연스럽지만 **정해두지 않으면 빈 화면이 나온다.**

**R-4. 임베딩 저장 위치** — MySQL `LONGBLOB` vs 외부 벡터 DB. **R-2 종속.**

### 데이터 규모 — 8월에 미리 해둘 것

**500편에서 추천하면 금방 바닥난다.** 사용자가 좋아하는 장르의 미시청작이 몇 편 안 된다.
추천 품질이 데이터 규모에 직접 종속되는데 이건 **판단 없이 실행만 하면 늘어난다.**

```
POST /api/admin/movies/seed/discover?pages=100   → 약 2,000편
```

4-M2절의 선행 작업 3번과 같은 항목이다.

---

## 4-INF. 인프라 · 실서버 배포 (2026-08-27 상의)

> 현재 **로컬 서버로만** 진행 중이다. 이 절은 "언제 실서버를 올릴 것인가"와
> "어떤 구성으로 올릴 것인가"를 정리한 것이다. 실행은 아직 하지 않았다.
> 배포 전 처리 항목의 단일 출처는 `docs/security-spec.md` S-11 *"배포 전 반드시 처리할 것"* 이다.

### 배포 시점 — 날짜가 아니라 트리거로 잡는다

**트리거: M2에서 카카오 로그인을 실기기에 붙이는 시점** (대략 9월 중순).

**왜 그 지점인가** — 실기기에서 `localhost`는 **폰 자신**을 가리킨다. Expo Go는 LAN IP로
우회되지만 **카카오 로그인은 등록된 redirect URI여야 해서 우회가 안 된다.** 그래서 인증
동선을 붙이는 순간이 로컬로 버틸 수 있는 한계선이다.

**왜 지금은 아닌가** — M2 초반(화면·네비게이션·목록)은 로컬 + LAN IP로 충분하다. 지금
배포하면 백엔드를 고칠 때마다 재배포 사이클이 붙어 M2 속도만 떨어진다.

**왜 11월(발표 직전)은 늦은가** — 배포에서 깨지는 것은 대부분 **인증 경로**이고,
S-11의 L-9~L-11이 정확히 그 목록인데 아직 열려 있다. **인증이 막히면 앱 전체가 막힌다.**
여기에 `movie_actor` 186,717행 / `person` 113,909행 데이터 이전도 처음엔 반드시 한 번 실패한다.

| 시점 | 할 일 |
|---|---|
| 8월 말 | 잔여 #27 → DevLog 브리지 → **L-10(`jwt.secret` 환경변수)·L-11(시간대 고정)** |
| 9월 초 | M2 착수. 로컬 + LAN IP |
| **9월 중순 (카카오 로그인)** | **실서버 + 도메인 + HTTPS, 데이터 이전, L-9** |
| 10월 | M3 |
| 11월 | 발표 — 배포본이 이미 2개월 굴러간 상태 |

⚠️ **L-10·L-11은 배포를 기다리지 말고 8월 말에 처리한다.** 배포하지 않고도 지금 검증되고,
배포 중에 만나면 진단이 크게 어려워지는 유형이다.

- **L-10** — 지금은 설정 한 줄인데, 배포 중에 만나면 *기동은 실패하고 로그는 다른 얘기를 하는* 상황이 된다
- **L-11** — 로컬은 KST, 클라우드 기본은 대개 UTC다. 9시간 어긋난 `expires_at`은
  **"로그인하자마자 만료"** 같은 엉뚱한 증상으로 나와서 원인 추적에 시간이 오래 걸린다

⚠️ **발표용 로컬 폴백을 지우지 말 것.** 배포본이 주 경로가 되어도 로컬 기동이 되는 상태는
유지한다 — 데모 당일 학교 네트워크·클라우드 장애가 드물지 않다.

### 구성 3안

| | A. 단일 인스턴스 동거 | B. 앱 + 관리형 DB | C. PaaS 컨테이너 |
|---|---|---|---|
| 모양 | VM 한 대에 Spring Boot + MySQL | VM(앱) + 관리형 DB | 이미지 빌드 → 배포, DB는 애드온 |
| 비용 | 가장 낮음 | DB가 프리티어 밖이면 크게 뜀 | 중간, 사용량 과금 |
| 운영 | 백업·업그레이드 직접 | 백업·스냅샷 자동 | 배포는 편하고 DB는 애드온에 종속 |
| 스케일 | 수직만 | 앱만 수평 확장 | 수평 쉬움 |
| 다중 인스턴스 잔여 | **전제 유지(무해)** | 앱 늘리면 깨짐 | 깨지기 쉬움 |

**→ 캡스톤 규모에서는 A를 채택한다.** 덤프가 수십 MB 수준이고(포스터를 경로만 저장한
결과 — 아래 참고) 동시 사용자는 발표장 인원이 상한이다. B의 관리형 DB가 주는 자동 백업·
장애 조치가 이 규모에서 비용을 정당화하지 못한다.

**A를 고르면 따라오는 것**

- **메모리** — JVM과 MySQL이 한 대에서 경합한다. 1GB는 위험하고(InnoDB 버퍼풀과 힙이
  서로 밀어낸다) **2GB가 실질 하한**이다. 여기서 아끼면 원인 불명 OOM으로 시간을 더 쓴다.
- **백업** — 자동이 없으니 `mysqldump` 스케줄이 필요하다. 재적재에 **TMDB 왕복 4,609회**가
  드는 걸 생각하면 DB를 날리는 비용이 크다.

**포스터를 경로만 저장한 결정이 여기서 이득으로 돌아온다.** `poster_path`/`backdrop_path`/
`person.profile_path`는 전부 TMDB CDN 경로 문자열이라(`tmdb-sync-spec.md` 6-3) 덤프가 가볍고
이미지 트래픽을 TMDB가 받아준다. 이미지를 직접 담았다면 포스터 4,609편 + 인물 113,909명으로
**수 GB**가 되어 2GB 인스턴스 이야기 자체가 성립하지 않았다.

### A → B / C 전환 비용 (발표 후 확장 가정)

| | A→B | A→C |
|---|---|---|
| 코드 변경 | 사실상 없음 | 거의 없음 |
| 설정 | DB 호스트·SSL·커넥션 수 | 12-factor 전면(= L-10의 확장) |
| 빌드 | 그대로 | 컨테이너화 (`bootBuildImage` 내장이라 Dockerfile 거의 불필요) |
| 데이터 | 덤프 → 임포트, 수십 MB | 동일 |
| 대략 | **반나절~하루** (대부분 검증) | **며칠** |

**A→B가 싼 이유는 앱이 MySQL이 어디 있는지 모르기 때문이다.** JPA 뒤에 가려져 있어
접속 문자열만 바뀐다. L-10이 되어 있으면 코드 변경은 0이다.
⚠️ 확인할 것 — 스키마가 `utf8mb4_0900_ai_ci`라 **MySQL 8.0 계열 전용**이다. 그리고 관리형
DB는 대개 SSL 접속을 요구한다.

**A→C도 생각보다 싸다 — 현재 코드에 로컬 파일 I/O가 0건이기 때문이다**
(`MultipartFile`·`Files.`·`new File(` 전부 없음, 2026-08-27 확인). 컨테이너 전환에서 가장
크게 걸리는 지점을 이미 통과한 상태다.

### ⚠️ 전환 비용을 실제로 결정하는 것 — 그 사이에 쌓이는 결합

**전환 자체보다 A에 머무는 동안 무엇에 결합되느냐가 비용을 좌우한다.** 현재 걸리는 것 2건.

**① `user.profile_image` — 가장 큰 변수**

`varchar(500)` 컬럼은 있으나 지금 채우는 업로드 경로가 없다(카카오 프로필 URL 형태).
**M2에서 "프로필 사진 업로드"를 붙이는 순간 갈린다.** 로컬 디스크에 두면 C에서는 컨테이너
재시작마다 사라지고 B에서도 인스턴스 교체 시 날아간다. **처음부터 오브젝트 스토리지나
외부 URL로 가면 이 비용이 0이고, 로컬에 두면 코드 + 데이터 이전 + URL 일괄 갱신이 붙는다.**
포스터를 경로만 저장한 것과 같은 판단을 여기에도 적용한다. → S-11 **L-13**

**② `@Scheduled` — 다중 인스턴스 위험이 시드에만 있는 게 아니다**

`BoxOfficeScheduler`에 크론이 **2건** 있다. 복제본을 늘리면 **인스턴스마다 크론이 발화해
박스오피스 수집이 중복 실행**된다. `tmdb-sync-spec.md` 잔여 #18(`MovieSeedService`의
`AtomicBoolean`)과 같은 부류인데 #18은 시드만 다루고 있어 스케줄러가 빠져 있었다.
**A에 머무는 동안은 무해**하고, B·C로 가며 앱을 2대 이상으로 늘리는 순간 함께 터진다.

**즉 A→C 비용의 실체는 "컨테이너화"가 아니라 이 둘을 다중 인스턴스 안전하게 만드는
작업이다.** 해법이 같으므로(DB 락 또는 실행 이력 테이블) 한 번에 처리된다.

### 이 세션에서 다루지 않은 것

- 클라우드 벤더·프리티어 조건 — 정보가 오래됐을 수 있어 **배포 시점(9월 중순)에 확인**한다
- CI/CD 파이프라인 구성
- 도메인 취득·HTTPS 인증서 발급 절차

---

## 5. Repository / 브랜치 전략

- **분리 기준**: 프론트(React Native)/백엔드(Spring Boot)처럼 언어·빌드 도구가 다를 때만 별도 repo (polyrepo)
- **실험/테스트 코드는 별도 repo가 아닌 Git 브랜치로 관리**

```
cinemory-backend (1개 repo)
├── main           # 항상 동작하는 안정 버전
├── develop        # 다음 마일스톤 통합 브랜치
└── feature/...    # 개별 작업/실험 브랜치

cinemory-app (1개 repo, React Native)
├── main
├── develop
└── feature/...
```

---

## 6. 프론트엔드 폴더 구조 (cinemory-app)

```
src/
├── navigation/
├── components/
├── store/               # Zustand
├── theme/
├── types/
├── screens/
│   ├── home/
│   ├── search/
│   ├── records/         # 시청한 영화 기록
│   ├── wishlist/        # 시청할 영화 기록
│   ├── recommend/       # 영화 추천
│   ├── report/          # 통계·캘린더·월말/연말 결산 리포트
│   ├── cinemap/         # 박스오피스·개봉예정·상영관 위치 맵
│   ├── collection/      # 컬렉션 커스터마이징
│   ├── social/          # 소셜 서비스
│   └── mypage/
├── api/
│   ├── movie.ts
│   ├── wishlist.ts
│   ├── recommend.ts
│   ├── report.ts
│   ├── cinemap.ts
│   ├── collection.ts
│   └── social.ts
└── hooks/               # React Query 기반 custom hook (useMovies, useReport 등)
```

---

## 7. 개발 도구 구성

### 사용 중
- **IntelliJ** — Spring Boot 백엔드
- **VS Code** — React Native/Expo 프론트엔드
- **MySQL** — DB
- **Claude Code** — AI 코딩 에이전트 (터미널/VS Code/IntelliJ)
- **Figma** — UI/UX 디자인 (브랜드 컬러 `#37beb0`, `#dbf5f0`, `#14d9d9`)
- **GitHub** — 버전 관리
- **Expo Go / EAS** — 실기기 테스트 및 빌드
- **Postman/Insomnia** — API 엔드포인트 테스트

### 5단계(출시 준비) 시점에 검토
- **Sentry 또는 Firebase Crashlytics**

### 자주 쓰는 명령어

**Git**
```bash
git status
git add .
git commit -m "메시지"
git push
git pull
git checkout -b 브랜치명
```

**React Native (Expo)**
```bash
npx create-expo-app cinemory
npx expo start
npx expo install 패키지명
npm install 패키지명
```

**EAS**
```bash
eas login
eas build:configure
eas build --profile development --platform android
eas build --platform android --profile production
```

**Spring Boot (Gradle)**
```bash
./gradlew build
./gradlew bootRun
./gradlew test
./gradlew clean
```

**Claude Code**
```bash
claude
claude --resume
/ide
```

**SQL**
```powershell
mysqldump -u root -p --no-data cinemory --result-file=docs/schema/cinemory_backup_v*.sql
```

---

## 8. 미결 사항 (Open Issues)

| 항목 | 현황 | 걸린 마일스톤 |
|---|---|---|
| ~~`movie_actor.role_tier` 경계값~~ | ✅ **확정** (D-1, 2026-08-13) — 비율 방식을 **기각**하고 절대 순번 채택. `0~4 LEAD / 5~9 SUPPORTING / 10~20 MINOR / 21~ EXTRA(0.0)`. 비율은 출연진 수 편차에 오염돼 200명 영화의 MINOR 총합이 LEAD를 넘었다. 근거는 `docs/tmdb-sync-spec.md` D-1 | — |
| ~~TMDB 초기 적재 전략~~ | ✅ **확정** (D-2, 2026-08-13) — 하이브리드. **박스오피스 역방향 시드**(주) + `discover?region=KR`(보) + 온디맨드. `/movie/popular`은 기각(할리우드 위주라 4-7 재매칭이 무력) | — |
| **R-1. 선호도 산출 입력** | `review`만 쓸지 `watch_record`·`wish_movie`까지 볼지 미결. 평점 없는 기록의 가중치도 미정 | **M3 (블로킹)** — 4-M3절 |
| **R-2. "추천"의 정의** | 규칙 기반 vs 임베딩 유사도 미결. **가장 큰 갈림길이며 R-4가 여기 종속** | **M3 (블로킹)** — 4-M3절 |
| **R-3. 콜드 스타트** | 기록 없는 신규 사용자 대상 미결. 정하지 않으면 빈 화면 | **M3 (블로킹)** — 4-M3절 |
| **R-4. 임베딩 저장 위치** | MySQL(`LONGBLOB`) vs 외부 벡터 DB 미결정. **R-2에서 규칙 기반을 택하면 소멸** | M3 (R-2 종속) |
| `movie` Soft Delete | `deleted_at` 컬럼 도입 여부 미결정 | — |
| `movie_ott`, `user_ott` 테이블 | `ott_platform` 확장 시점에 추가 | — |
| ~~마일스톤 진행 상황~~ | ✅ **2026-08-11 갱신 완료** (4번 섹션) | — |
