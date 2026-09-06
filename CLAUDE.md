@AGENTS.md

# CineMory 프론트엔드 (cinemory-app)

React Native (Expo SDK 56) + TypeScript. 백엔드는 별도 리포 `cinemory-backend`.

## 하는 역할
**구현**, **디버깅**, **한 일을 변경 이력에 기록**

## 문서

- `cinemory-backend/docs/CineMory_기획노트.md` — 프로젝트 기획 문서

**설계 스펙은 `docs/`에 있고 그것이 단일 출처. 작업 전에 관련 문서 확인**

- `docs/M2-frontend-spec.md` — 화면·API 표면·네비게이션·백엔드 선행 항목
- `docs/M2A-foundation-spec.md` — 기반 계층 구현 상세

1. 문서를 수정할 때는 **`docs/`의 실제 파일을 직접 편집.** 별도의 "적용 지시서"나
   임시 사본을 만들어 전달하지 말 것.
2. Claude.ai 프로젝트에 첨부된 사본이 보이더라도 **그것을 기준으로 삼지 말 것.**
   수동 업로드본이라 stale이므로 **내용이 다르면 항상 리포 파일이 옳음.**
3. 문서를 고쳤으면 해당 문서의 **변경 이력 표에 항목을 추가**. 결정 근거까지 기입.
4. 작업 시작 시 `ls docs/`로 접근 가능한지 먼저 확인.

## 하지 말 것

1. **`src/types/api.d.ts`를 손으로 쓰거나 고치지 않을 것.** 백엔드 `/v3/api-docs`에서
   `npm run gen:api`로 생성.
2. **API 계약을 추측하지 말 것.** 백엔드 표면의 단일 출처는
   `cinemory-backend/docs/controller-layer-spec.md`. 접근할 수 없으면 **묻기.**
3. **네이티브 모듈을 추가하거나 `expo prebuild`를 실행하지 않을 것.** 필요해지면 먼저 알리기.
4. **`src/api/client.ts`의 단일 비행(single-flight) 재발급을 이해 없이 손대지 않을 것.**
   백엔드가 리프레시 회전 + 재사용 감지를 하므로 동시 401에서 `reissue`가 두 번 나가면
   **사용자 전 세션이 폐기됨.** 증상이 "가끔 혼자 로그아웃"이라 재현이 어려움.

## 코드 규칙

- 패키지 설치는 **`npx expo install`**.
- 화면은 **`src/api/`를 직접 import하지 않을 것** — `src/hooks/`를 경유.
- 화면에 **색상 리터럴 금지** — `src/theme/tokens.ts`만 참조.
- 화면에 **RN `<Text>` 직접 사용 금지** — `src/components/primitives/Txt`.
- 화면에 **경로 문자열(`/api/...`) 금지** — `src/api/endpoints.ts`.
- **TMDB 이미지 URL을 화면에서 조립하지 말 것** — `src/constants/tmdb.ts`의 `tmdbImageUrl()`.
- 화면 간에는 **엔티티가 아니라 ID를 넘길 것** (`navigate('MovieDetail', { movieId })`).
- Tailwind 색상 클래스는 **kebab-case**(`text-muted-foreground`). 토큰 키는 camelCase지만
  `tailwind.config.js`가 중첩 매핑으로 편다.

## 도메인 사실 (틀리기 쉬움)

- **별점은 `Double` 0.0~10.0.** 별 5개 UI면 저장 시 ×2 변환.
- **`watch_record`와 `review`는 다른 리소스.** 전자는 회차별·비공개·날짜 nullable,
  후자는 영화당 1개·공개. **한 폼에 섞지 않을 것.**
- **검색 응답은 `{registered, suggestions}` 2섹션**이고 이 엔드포인트만 `page`가 1-based.
  `suggestions`에 `movieId`가 없는 것이 "미등록"의 신호이며, 선택 시
  `POST /api/movies/sync`로 등록한 뒤 이동.
- **무한스크롤은 `last`로 판정.** `content.length === 0`이 아님.
- `posterPath`는 `/abc.jpg` 형태의 TMDB 경로. base URL 조립은 프론트 몫.

## 범위

화면 우선순위는 `docs/M2-frontend-spec.md` §2를 따름 — **1군(mypage·search·records·home)
→ 2군 → 3군.**