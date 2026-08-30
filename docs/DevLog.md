# CineMory 개발 로그

세션 단위로 무엇을, 왜 했는지 남기는 기록이다. 스펙 자체의 변경 근거는 각 스펙 문서의
"변경 이력" 표가 우선하고, 여기는 그 작업들이 실제로 어떤 순서·맥락으로 일어났는지를
narrative로 남긴다.

---

## 2026-08-31 — M2-A 실기기 검증 (§12 A·B·C·D)

**배경**: 전날 코드 반영이 끝난 상태에서, `docs/M2A-foundation-spec.md` §12 절차대로
실기기(Expo Go)에서 처음 구동해 검증을 진행했다.

- **12-0 사전 준비**: PC LAN IP(`192.168.0.5`) 확인 → `.env.local`에
  `EXPO_PUBLIC_API_BASE_URL` 설정 → 백엔드 기동 → 폰 브라우저로 `/api/movies` JSON 확인.
  `npm run gen:api`로 `src/types/api.d.ts`를 생성하고, `src/types/index.ts`를 생성 타입
  별칭으로 전면 교체했다(§11 규칙 — DTO 필드명을 손으로 다시 적지 않는다). `TokenResponse`는
  생성 스키마가 세 필드 다 optional인데 `authStore.setTokens()`가 바로 값을 꺼내 쓰므로
  `Required<S['TokenResponse']>`로만 좁혔고, 나머지는 생성 스키마 그대로 별칭 처리했다.
  `PageResponse<T>` 제네릭은 백엔드가 타입별로 따로 생성해서(제네릭 자체가 없음) 우리 쪽
  래퍼를 그대로 유지했다 — 필드 구성이 6개 변형에서 전부 동일함을 직접 대조해 확인했다.

- **첫 구동 트러블슈팅**: QR 스캔 후 Expo Go에 앱 아이콘만 뜨고 진행률 표시가 없었고,
  Metro 터미널에 로그가 전혀 안 찍혔다. 방화벽·LAN IP·Metro 프로세스·네트워크 어댑터를
  전부 점검했으나 전부 정상이었고(8080·8081 둘 다 폰 브라우저로 직접 접속 성공), 결국
  **Expo Go 앱을 재시작하니 정상 실행**됐다 — 네트워크·코드 문제가 아니라 Expo Go 클라이언트
  쪽의 일시적 문제였던 것으로 보인다.

- **12-1 DebugProbe 신설**: 모든 화면이 플레이스홀더라 아무것도 눌러볼 수 없는 상태였어서,
  `src/screens/_debugProbe.tsx`를 만들어 `AuthNavigator`의 `Login`과 `HomeStack`의 `Home`
  양쪽에 `__DEV__` 가드로 등록했다. 처음엔 `Home`에만 두려 했으나, `RootNavigator`가
  `status`로 Auth/Main을 완전히 분기하는 구조라 비로그인 상태에선 `Home`에 닿을 방법이 없어
  **두 라우트에 같은 컴포넌트를 등록**하는 쪽으로 스펙을 수정했다(§12-1 changelog 참고).
  계정 정보는 코드에 하드코딩하지 않고 `.env.local`의 `EXPO_PUBLIC_DEV_EMAIL`/
  `EXPO_PUBLIC_DEV_PASSWORD`로 뺐다. `refreshOnce()`에는 D 검증용 임시
  `console.log('[reissue]', Date.now())`를 추가했다.

- **A (스타일 육안 확인)**: 통과. `bg-primary` 시안 배경, `text-muted-foreground` 회색,
  `text-primary-foreground` 흰 글자, `rounded-lg`/`rounded-md` 모서리 전부 확인. 이 화면의
  모든 박스 요소(프로브 블록·Card·Button)가 전부 의도적으로 둥근 클래스를 쓰고 있어서
  "전부 둥글게 보이는" 게 정상이라는 점도 확인.

- **B (부팅 시퀀스)**: B-1·B-2·B-3 전부 통과. B-2에서 로그인 직후 화면 전환 시 "로그인
  화면이 살짝 보이는 것 같다"는 관찰이 있었는데, 원인은 버그가 아니라 **Login과 Home에
  동일한 DebugProbe 컴포넌트**를 걸어 둔 탓에 네이티브 헤더(Home 쪽에만 있음)가 콘텐츠보다
  한 프레임 늦게 붙는 시각적 착시였다. `App.tsx`가 `status==='loading'`인 동안 `return null`을
  반환해 `status`가 정해지기 전엔 어떤 네비게이터도 마운트되지 않는 구조라, `Login`이 실제로
  그려질 경로 자체가 없다는 걸 코드로 재확인했다. B-3(SecureStore의 `cinemory.user`에 깨진
  JSON 심기)은 지난 세션에 고친 `restore()`의 이중 try/catch 안전망이 실제로 스플래시 영구
  정지를 막아내는 것을 실기기에서 처음으로 실증했다.

- **C (네비게이션)**: 탭 5개 이동, 안드로이드 하드웨어 뒤로가기(하위 화면→홈, 홈→앱 종료),
  하단 탭바가 콘텐츠를 안 가리는 것까지 통과. **C-3(탭 전환 후 스택 깊이 유지)은 모든 화면이
  플레이스홀더라 실제로 깊이 들어갈 방법이 없어서**, DebugProbe에 로그인 상태에서만 보이는
  임시 버튼(`navigation.navigate('MovieDetail', { movieId: 1 })`)을 추가해 검증했다 — Home
  탭에서 MovieDetail로 이동 후 다른 탭을 갔다 와도 화면이 유지되는 것을 확인, 통과.

- **D (동시 401에서 reissue 1회)**: 백엔드 `access-token-ttl`을 `PT10S`로 낮추고
  `동시요청 ×4`를 실행해 Metro 콘솔에 `[reissue]` 로그가 **1회만** 찍히는 것을 확인했다.
  다만 4/4 요청 성공 여부·로그인 유지 여부·`access-token-ttl` 원복은 이 세션에서 최종
  확인이 끝나지 않아 §9 체크리스트에 진행 중(⏳)으로 남겨뒀다.

- **문서 정리**: `docs/M2A-foundation-spec.md`의 §9 검증 체크리스트, §12-0 gen:api 완료
  확인, §E 되돌리기 체크리스트에 실제 결과를 반영했다. `src/screens/_debugProbe.tsx`와
  `client.ts`의 임시 `console.log`는 D 최종 확인 전이라 아직 지우지 않았다.

**후속 업데이트 (같은 날)**: D의 4/4 성공·로그인 유지까지 최종 확인해 M2-A 실기기 검증
A·B·C·D가 전부 끝났다. 곧바로 `src/screens/_debugProbe.tsx` 삭제, `AuthNavigator`/
`HomeStack`을 원래 플레이스홀더로 복구, `client.ts`의 임시 `console.log` 제거까지
정리했다(`tsc --noEmit` 통과 확인). **남은 것은 백엔드 `access-token-ttl`을 `PT30M`으로
되돌리는 것(사용자가 별도 진행 중)과 `api.d.ts` 커밋 여부 확인뿐** — 이 둘만 끝나면
M2-A 완료.

---

## 2026-08-30 — §11 리뷰 수정 사항 코드 반영 + 타입 코드젠 전환

- `docs/M2A-foundation-spec.md` §11에 리뷰로만 기록돼 있던 수정 지시 8건이 실제 코드에는
  반영되어 있지 않은 상태였음을 확인하고 전부 적용했다: `authStore.restore()`의
  try/catch, `tailwind.config.js` 색상 키 kebab 매핑, `tokens.ts`의 dead `typography`
  제거, `@react-native-kakao/*` 의존성 제거, 요청 인터셉터의 갱신 실패 후 재시도 중단,
  `ApiError`를 `Error` 상속 클래스로 전환, `UserResponse`/`WriteReviewRequest` 계약 정정.
- 사용자 제안으로 `restore()`의 catch 블록 안 삭제 로직이 자체적으로 다시 던질 수 있는
  구멍을 한 번 더 감쌌고, `App.tsx`의 안전망도 상태를 직접 `anonymous`로 바꾸도록 강화했다
  (빈 `.catch(() => {})`는 겉보기 안전망일 뿐이라는 지적).
- `npm run gen:api`로 `src/types/api.d.ts`를 처음 생성하고, `src/types/index.ts` 전체를
  생성 타입 별칭으로 교체했다. 파일 끝에 짝 없는 `*/`가 남아 있던 문법 오류도 이 과정에서
  같이 정리됐다.
- `.env.local`에 LAN IP 기반 `EXPO_PUBLIC_API_BASE_URL`을 설정했다(첫 시도는 `.env`였으나
  `.gitignore`가 `.env*.local`만 걸러서 `.env.local`로 옮김).
