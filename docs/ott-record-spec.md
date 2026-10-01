# CineMory — OTT 시청 기록 연결 설계 스펙 (B-13 프론트 몫)

> 상위 문서: `docs/M2-frontend-spec.md` — **계약과 사실은 그쪽, 실행과 검증은 여기**
> 대상: `cinemory-app` (Expo SDK 57 / RN 0.86 / Dev Client) — **JS 전용, 네이티브 변경 없음 → 재빌드 불필요**
> 선행: 백엔드 잔여 #15 완료(2026-09-21, `GET /api/ott-platforms`) · `gen:api` 재생성 완료(타입 존재 확인)
>
> ⚠️ **실서버 배포(`cinemory-backend/docs/deploy-spec.md`) 전에 끝낸다.** 운영은 사용자 데이터를 새로
> 시작하므로(D-5), 이 작업 전에 쌓인 운영 기록에는 OTT가 하나도 없게 되고 **소급 복구가 불가능**하다.

---

## 0. 범위와 배경

### 0.1 백엔드는 9/21에 끝났는데 앱이 아직 막고 있다

`WatchRecordModal.handleSubmit`이 `watchType === 'OTT'`면 *"OTT 플랫폼 선택 기능은 준비 중입니다"* 로
저장을 막는다. 근거였던 *"목록을 가져올 API가 없다"* 는 잔여 #15로 해소됐으나 프론트 연결이 빠졌다.

**영향** — ① 사용자가 OTT로 본 영화를 OTT로 기록할 수 없다 ② 리포트 *관람 방식 분포*에서 OTT가 영원히 0
③ 운영 배포 후에는 그 사이 기록을 되돌릴 수 없다.

### 0.2 ★ 함께 닫아야 하는 잠복 버그 — 상세 화면의 빠른 별점

`MovieDetailScreen.handleChangeMyRating`은 대표 기록의 별점만 바꾸려고 **기존 필드를 다시 실어**
`PATCH /api/records/{id}`(전체 치환, B-15)를 보낸다. 그런데 실어 보내는 필드에 **`ottPlatformId`가 없다.**

```ts
body: {
  watchDate, watchType, placeDetail, rating: nextRating, privateReview,
  // ottPlatformId 누락
}
```

지금은 OTT 기록이 존재할 수 없어 증상이 없다. **이 스펙으로 OTT 저장이 열리는 순간**, OTT 대표 기록에서
별을 탭하면 `watchType=OTT` + `ottPlatformId=null` → 백엔드 `validateWatchTypeConsistency`가
**`INVALID_WATCH_TYPE_OTT_COMBINATION`(400)** 을 낸다. → **2-4에서 같이 고친다.**

### 0.3 백엔드 계약 (변경 없음 — 확인용)

| 항목 | 내용 |
|---|---|
| 목록 | `GET /api/ott-platforms` → `OttPlatformResponse[]` = `{ id, name }`. **활성(`is_active`) 항목만**, 페이징 없음, **비로그인 허용** |
| 저장 규칙 | `watchType=OTT` ⇔ `ottPlatformId` 필수. **THEATER·ETC·미선택이면 `ottPlatformId`가 있으면 안 된다** — 둘 다 위반 시 `INVALID_WATCH_TYPE_OTT_COMBINATION`(400) |
| 없는 ID | `OTT_PLATFORM_NOT_FOUND`(404) |
| 응답 | `WatchRecordResponse.ottPlatform` = `{ id, name }` 또는 `null` |
| 비활성 플랫폼 | 서버는 저장·수정 시 활성 여부를 **검사하지 않는다**(`findById`). 목록에서만 빠진다 |

---

## 1. 결정 사항

| # | 결정 | 이유 |
|---|---|---|
| O-1 | **2단 시트** — 관람 방식 시트에서 OTT를 고르면 곧바로 **플랫폼 시트**를 연다 | 기존 `ActionSheet` 재사용, 새 컴포넌트 0. OTT를 골랐는데 플랫폼이 비어 있는 중간 상태를 최소화한다 |
| O-2 | 폼에 **"OTT 플랫폼" 행**을 `watchType === 'OTT'`일 때만 노출 — 탭하면 플랫폼 시트 재오픈 | 플랫폼만 바꾸고 싶을 때 관람 방식부터 다시 고르지 않게 |
| O-3 | **OTT가 아닌 방식으로 바꾸면 `ottPlatformId`를 즉시 비운다** | 비우지 않으면 0.3 저장 규칙 위반(400) |
| O-4 | OTT인데 플랫폼 미선택이면 **클라이언트에서 막는다**("OTT 플랫폼을 선택해 주세요") | 서버 400보다 친절하고, 이미 있는 날짜 검증과 같은 패턴 |
| O-5 | 목록 캐시 **`staleTime: Infinity`**(앱 세션 동안 1회 조회) | 고정 길이 참조 데이터. 바뀌는 일이 운영자 조작뿐이다 |
| O-6 | **수정 모드에서 기록의 플랫폼이 목록에 없으면**(비활성화됨) 기록의 `ottPlatform.name`으로 표시하고 그대로 저장 가능 | 서버가 활성 여부를 검사하지 않으므로 저장이 성공한다. 목록에 없다고 지워 버리면 사용자 데이터가 조용히 바뀐다 |
| O-7 | 기록 표시는 **"OTT · 넷플릭스"** (플랫폼 이름이 있으면 관람 방식 라벨 뒤에) | 상세 화면 회차 목록의 기존 `" · 극장 · 장소"` 형식과 동일 |
| O-8 | 목록이 **비어 있거나 조회 실패**면 플랫폼 시트 대신 안내(`Alert`)를 띄우고 OTT 선택을 되돌린다 | 운영 초기에 `ott_platform` 이관 누락 같은 상황에서 저장 불가 상태로 갇히지 않게 |

---

## 2. 파일 단위 지시

> 순서대로. 각 단계 후 `npx tsc --noEmit`.

### 2-1. 타입 · 엔드포인트 · API

| 파일 | 변경 |
|---|---|
| `src/types/index.ts` | `export type OttPlatformResponse = Required<S['OttPlatformResponse']>;` 추가(기존 `WatchType` 근처) |
| `src/api/endpoints.ts` | `ott: { platforms: '/api/ott-platforms' }` 추가 |
| `src/api/ott.ts` (신규) | `ottApi.platforms: () => api.get<OttPlatformResponse[]>(EP.ott.platforms).then((r) => r.data)` |

### 2-2. 쿼리 키 · 훅

| 파일 | 변경 |
|---|---|
| `src/hooks/queryKeys.ts` | `ott: { platforms: () => ['ott', 'platforms'] as const }` |
| `src/hooks/useOttPlatforms.ts` (신규) | `useQuery({ queryKey: queryKeys.ott.platforms(), queryFn: ottApi.platforms, staleTime: Infinity })` — O-5. **인증 불필요**(비로그인 허용 엔드포인트) |

### 2-3. `WatchRecordModal.tsx`

1. **상태 추가** — `const [ottPlatformId, setOttPlatformId] = useState<number | null>(null);` ·
   `const [platformSheetVisible, setPlatformSheetVisible] = useState(false);` · `useOttPlatforms()` 호출.
2. **열릴 때 초기화**(기존 `useEffect`) — `setOttPlatformId(editing?.ottPlatform?.id ?? null)`.
3. **관람 방식 시트 옵션**(`typeOptions`) — 각 옵션의 `onPress`를
   - OTT: `setWatchType('OTT')` 후 **플랫폼 시트 오픈**(O-1). 단 목록이 비었거나 에러면 O-8 안내 후
     `watchType`을 직전 값으로 되돌린다.
   - 그 외 / 선택 안 함: `setWatchType(...)` + **`setOttPlatformId(null)`**(O-3).
   - ⚠️ 시트 두 개를 연달아 띄울 때 **첫 시트가 닫힌 뒤** 두 번째를 연다 — RN `Modal` 두 개가 동시에 전환되면
     Android에서 두 번째가 뜨지 않는 경우가 있다. `ActionSheet`의 `onClose` 이후(또는 `setTimeout(…, 0)`)에 연다.
     실기기에서 확인할 것(§3 #2).
4. **플랫폼 시트** — `ActionSheet` 하나 더. 옵션 = 목록의 `name` → `setOttPlatformId(id)`.
   제목 "OTT 플랫폼". 현재 선택 항목에 `" (현재)"` 표기(SettingsScreen 공개범위 시트와 같은 관례).
5. **"OTT 플랫폼" 행**(O-2) — 관람 방식 행 바로 아래, `watchType === 'OTT'`일 때만. 표시값:
   목록에서 `ottPlatformId`로 찾은 이름 → 없으면 `editing?.ottPlatform?.name`(O-6) → 둘 다 없으면 `"선택해 주세요"`.
6. **기존 "준비 중" 안내 문구 블록(`watchType === 'OTT' && <Txt color="destructive">…`) 삭제.**
7. **`handleSubmit`**
   - 기존 OTT 차단 `Alert` **삭제**.
   - O-4: `watchType === 'OTT' && ottPlatformId == null` → `Alert.alert('OTT 플랫폼을 선택해 주세요')` 후 return.
   - `fields`에 `ottPlatformId: watchType === 'OTT' ? ottPlatformId ?? undefined : undefined` 추가 — **방어적으로
     한 번 더 OTT일 때만 싣는다**(O-3이 상태를 비우지만 전송 직전에도 규칙을 보장).

### 2-4. `MovieDetailScreen.tsx` — 0.2 버그

| 위치 | 변경 |
|---|---|
| `handleChangeMyRating`의 `body` | `ottPlatformId: representativeRecord.ottPlatform?.id ?? undefined` 추가 |
| 그 위 주석 | *"PATCH는 전체 치환이라 기존 값을 그대로 다시 싣는다"* 에 **`ottPlatformId`도 포함 — 빠지면 OTT 기록에서 400**(0.2) 한 줄 추가 |
| 회차 목록 표시(`WATCH_TYPE_LABEL[record.watchType]` 부분) | OTT이고 `record.ottPlatform?.name`이 있으면 `" · OTT · {name}"`(O-7) |

> ⚠️ **같은 "전체 치환 PATCH 재전송" 패턴이 다른 곳에 더 있는지** `grep -rn "updateRecord.mutate\|recordApi.update" src`로
> 확인한다. 2026-10-01 기준으로는 `WatchRecordModal`·`MovieDetailScreen` 두 곳뿐이다.

### 2-5. 캐시 무효화

추가 작업 없음 — 기록 생성·수정은 이미 `['records']`·리포트 캐시를 무효화한다(리포트 6곳, M2-C2).
OTT 목록은 기록 변경과 무관하다.

---

## 3. 실기기 검증

| # | 시나리오 | 기대 |
|---|---|---|
| 1 | 새 기록 → 관람 방식 OTT → 플랫폼 선택 → 저장 | 저장 성공. 상세 회차 목록에 **"· OTT · {플랫폼}"** |
| 2 | 1의 두 번째 시트가 **Android에서 실제로 뜨는가** | 뜬다(2-3 ③의 ⚠️) |
| 3 | OTT 고른 뒤 플랫폼 시트를 그냥 닫고 저장 | "OTT 플랫폼을 선택해 주세요", 저장 안 됨 |
| 4 | OTT 기록 수정 → 극장으로 변경 → 저장 | 성공(400 아님). 플랫폼 표시 사라짐 |
| 5 | 극장 기록 수정 → OTT로 변경 → 플랫폼 선택 → 저장 | 성공 |
| 6 | **OTT 대표 기록에서 상세 화면 빠른 별점 탭** | **성공**(0.2 — 고치기 전엔 400) |
| 7 | 리포트 → 관람 방식 분포 | OTT 항목이 나타남 |
| 8 | 비로그인 상태에서 목록 조회(개발용 확인) | 200 |

---

## 4. 백엔드로 돌려보낼 것 (낮음)

- **`OttPlatformResponse`가 백엔드에 두 개 있다** — `domain/ott/dto`와 `domain/watch/dto`(필드 동일).
  Springdoc은 스키마 이름을 단순 클래스명으로 만들어 **같은 이름 `OttPlatformResponse`로 합쳐진다.** 지금은
  필드가 같아 무해하지만, 한쪽만 바뀌면 생성 타입이 **어느 쪽을 따를지 보장되지 않는다.** `watch` 쪽을 지우고
  `ott` 쪽을 참조하게 정리할 것 — `controller-layer-spec.md` 잔여 항목으로 등록.

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-10-01 | **신설 — B-13 프론트 연결.** 백엔드 잔여 #15는 9/21에 끝났으나 `WatchRecordModal`이 여전히 OTT 저장을 막고 있었다. 실서버 배포가 10월 초로 앞당겨지면서 **운영 데이터가 OTT 없이 쌓이기 시작하면 소급 복구가 불가능**해 배포 전 작업으로 올렸다. 코드 확인 중 **상세 화면 빠른 별점의 전체 치환 PATCH가 `ottPlatformId`를 빠뜨리는 잠복 버그**를 발견 — OTT 저장이 막혀 있어 증상이 없었을 뿐, 이 작업으로 열리는 순간 400이 된다. 같은 작업에서 닫는다. 백엔드의 `OttPlatformResponse` 중복(스키마 이름 충돌 가능)은 §4로 돌려보냄 |
