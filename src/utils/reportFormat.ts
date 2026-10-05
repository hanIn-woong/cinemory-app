// 리포트 화면 공용 표기 — 누적·월간·연간이 같은 문구를 쓴다.

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

// averageRating은 0.0~10.0 스케일 — 화면은 ÷2로 5점 만점 표기(§7.3 계약).
export function formatStars(rating: number): string {
  return (rating / 2).toFixed(1);
}
