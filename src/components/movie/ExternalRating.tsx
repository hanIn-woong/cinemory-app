import { View } from 'react-native';
import { Txt } from '../primitives/Txt';

interface ExternalRatingProps {
  // 출처 라벨(예: 'TMDB') — 우리 평점과 병기되므로 반드시 함께 보여 준다(docs/M2B-screens-spec.md §6 B-4).
  label: string;
  // 0~10 그대로 표시한다 — 별 5개로 바꾸지 않는다. 별 변환은 RatingStars(사용자 별점) 몫이다(§4).
  average: number | null;
  count: number;
}

// 출처 라벨 폭 — 상세의 평점 블록(MovieRatings)에서 우리 평점 줄과 숫자 시작점을 맞추려고 공유한다.
export const RATING_LABEL_CLASS = 'w-[72px]';

// 외부 평점(TMDB) 숫자 표시. 이름을 RatingStars와 반드시 구분한다(§4 표).
// average가 null이면(count === 0) 아무것도 렌더하지 않는다 — 플레이스홀더 숫자나 '-'를 넣지 않는다(§6).
export function ExternalRating({ label, average, count }: ExternalRatingProps) {
  if (average == null) return null;
  return (
    <View className="flex-row items-center">
      <Txt variant="caption" color="mutedForeground" className={RATING_LABEL_CLASS}>
        {label}
      </Txt>
      <Txt variant="h4">{average.toFixed(1)}</Txt>
      <Txt variant="caption" color="mutedForeground">
        {' / 10'}
      </Txt>
      <Txt variant="caption" color="mutedForeground" className="ml-2">
        {`(${count.toLocaleString()}명)`}
      </Txt>
    </View>
  );
}
