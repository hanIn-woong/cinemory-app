import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '../api/client';

// 서버 errors[]를 react-hook-form의 setError에 필드명으로 매핑한다
// (docs/M2B-screens-spec.md §5.1 — M2-B 폼 전부가 쓴다).
// 필드에 묶이지 않는 에러(예: 로그인 자격 증명 불일치)는 배너로 보여줄 메시지를 반환한다.
export function applyServerErrors<T extends FieldValues>(error: ApiError, setError: UseFormSetError<T>): string | null {
  if (error.fieldErrors.length === 0) return error.message;
  for (const { field, reason } of error.fieldErrors) {
    setError(field as Path<T>, { type: 'server', message: reason });
  }
  return null;
}
