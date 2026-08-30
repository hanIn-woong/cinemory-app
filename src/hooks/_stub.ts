// M2-A는 훅의 파일·시그니처·queryKey 규약만 확정한다. 실제 API 연동·캐시 무효화는
// M2-B에서 채운다 (docs/M2A-foundation-spec.md §7).
export function notImplemented(hookName: string): never {
  throw new Error(`${hookName}: M2-B에서 구현 예정`);
}
