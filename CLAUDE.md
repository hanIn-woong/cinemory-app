@AGENTS.md

# CineMory 프론트엔드 (cinemory-app)

React Native (Expo SDK 56) + TypeScript. 백엔드는 별도 리포 `cinemory-backend`.

## 하는 역할
**구현**, **디버깅**, **한 일을 변경 이력에 기록**

## 문서

**설계 스펙은 `docs/`에 있고 그것이 단일 출처다. 작업 전에 관련 문서를 읽는다.**

- `docs/M2-frontend-spec.md` — 화면·API 표면·네비게이션·백엔드 선행 항목
- `docs/M2A-foundation-spec.md` — 기반 계층 구현 상세

1. 문서를 수정할 때는 **`docs/`의 실제 파일을 직접 편집한다.** 별도의 "적용 지시서"나
   임시 사본을 만들어 전달하지 않는다.
2. Claude.ai 프로젝트에 첨부된 사본이 보이더라도 **그것을 기준으로 삼지 않는다.**
   수동 업로드본이라 stale이다. **내용이 다르면 항상 리포 파일이 옳다.**
3. 문서를 고쳤으면 해당 문서의 **변경 이력 표에 항목을 추가**한다. 결정의 근거까지 남긴다.
4. 작업 시작 시 `ls docs/`로 접근 가능한지 먼저 확인한다.

## 하지 말 것

1. **`src/types/api.d.ts`를 손으로 쓰거나 고치지 않는다.** 백엔드 `/v3/api-docs`에서
   `npm run gen:api`로 생성한다. **DTO 필드명을 추측하면 반드시 어긋난다** — 실제로 그렇게
   실패한 이력이 있다(M2-frontend-spec §0). `src/types/index.ts`는 생성 전까지의 임시본이며,
   생성에 성공하면 즉시 별칭으로 교체한다.
2. **API 계약을 추측하지 않는다.** 백엔드 표면의 단일 출처는
   `cinemory-backend/docs/controller-layer-spec.md`다. 접근할 수 없으면 **묻는다.**
3. **네이티브 모듈을 추가하거나 `expo prebuild`를 실행하지 않는다.** Expo Go → Dev Client로
   워크플로가 바뀌는 되돌리기 어려운 변경이다. 필요해지면 먼저 알린다.
4. **`src/api/client.ts`의 단일 비행(single-flight) 재발급을 이해 없이 손대지 않는다.**
   백엔드가 리프레시 회전 + 재사용 감지를 하므로 동시 401에서 `reissue`가 두 번 나가면
   **사용자 전 세션이 폐기된다.** 증상이 "가끔 혼자 로그아웃"이라 재현이 어렵다.
5. **검증용으로 바꾼 설정값은 같은 작업 안에서 되돌린다** (TTL 등). 되돌리지 않으면
   나중에 원인 불명 증상이 된다 — 이 프로젝트에서 두 번 발생했다.

## 코드 규칙

- 패키지 설치는 **`npx expo install`**. Expo 56이 버전을 관리하는 것이 많다.
- 화면은 **`src/api/`를 직접 import하지 않는다** — `src/hooks/`를 경유한다.
- 화면에 **색상 리터럴 금지** — `src/theme/tokens.ts`만 참조.
- 화면에 **RN `<Text>` 직접 사용 금지** — `src/components/primitives/Txt`.
- 화면에 **경로 문자열(`/api/...`) 금지** — `src/api/endpoints.ts`.
- **TMDB 이미지 URL을 화면에서 조립하지 않는다** — `src/constants/tmdb.ts`의 `tmdbImageUrl()`.
- 화면 간에는 **엔티티가 아니라 ID를 넘긴다** (`navigate('MovieDetail', { movieId })`).
- Tailwind 색상 클래스는 **kebab-case**다(`text-muted-foreground`). 토큰 키는 camelCase지만
  `tailwind.config.js`가 중첩 매핑으로 편다.

## 도메인 사실 (틀리기 쉬움)

- **별점은 `Double` 0.0~10.0.** 1~5가 아니다. 별 5개 UI면 저장 시 ×2 변환.
- **`watch_record`와 `review`는 다른 리소스.** 전자는 회차별·비공개·날짜 nullable,
  후자는 영화당 1개·공개. **한 폼에 섞지 않는다.**
- **검색 응답은 `{registered, suggestions}` 2섹션**이고 이 엔드포인트만 `page`가 1-based다.
  `suggestions`에 `movieId`가 없는 것이 "미등록"의 신호이며, 선택 시
  `POST /api/movies/sync`로 등록한 뒤 이동한다.
- **무한스크롤은 `last`로 판정한다.** `content.length === 0`이 아니다.
- `posterPath`는 `/abc.jpg` 형태의 TMDB 경로. base URL 조립은 프론트 몫이다.

## 범위

화면 우선순위는 `docs/M2-frontend-spec.md` §2를 따른다 — **1군(mypage·search·records·home)
→ 2군 → 3군.** 3군(social·cinemap·recommend)이 뒤에 있는 것은 취향이 아니라
**백엔드가 없어서**다(§11). 지금 만들면 빈 화면이 된다.

## 커밋

Conventional Commits. `feat:` `fix:` `docs:` `refactor:` `chore:` `test:` `perf:` `style:`
(상세: `cinemory-backend/docs/Conventional_Commits_가이드.md`)
작업은 `develop`에서 분기한 `feature/*`에서 한다.