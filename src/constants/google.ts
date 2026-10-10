// 구글 웹 클라이언트 ID — 토큰의 aud다(docs/google-login-spec.md §1). Android 클라이언트 ID를 넣으면 DEVELOPER_ERROR.
// 앱 번들에 들어가도 되는 공개 값이라 EXPO_PUBLIC_으로 둔다(백엔드 account-integrity-spec D-5-F). 값은 .env.local.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
