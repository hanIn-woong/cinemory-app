import { View } from 'react-native';
import type { MovieRatings as MovieRatingsData } from '../../types';
import { apiToStars } from '../../utils/rating';
import { Txt } from '../primitives/Txt';
import { ExternalRating, RATING_LABEL_CLASS } from './ExternalRating';
import { RatingStars } from './RatingStars';

interface MovieRatingsProps {
  ratings: MovieRatingsData | undefined;
  // 위 여백은 블록이 그려질 때만 생겨야 한다 — 화면에서 Spacer로 두면 숨겨졌을 때 빈 간격이 남는다.
  className?: string;
}

// 상세의 집계 평점 블록 — 우리 평점과 TMDB를 두 줄로 병기한다(A안, docs/M2B-screens-spec.md §6 B-4).
// 대체가 아니라 병기라 출처 라벨과 count를 함께 보여 주고, 표시 방식도 일부러 다르게 둔다 —
// 우리 평점은 사용자 별점 계열(별 5개), TMDB는 0~10 숫자 그대로.
// average가 null인 줄은 렌더하지 않고(안내 문구 없음 — 2026-10-06 사용자 결정), 둘 다 null이면 블록 전체를 숨긴다.
export function MovieRatings({ ratings, className }: MovieRatingsProps) {
  // gen:api 타입은 springdoc 특성상 전부 optional이다 — 빠진 값은 "평점 없음"과 같게 다룬다.
  const cinemory = ratings?.cinemory?.average ?? null;
  const cinemoryCount = ratings?.cinemory?.count ?? 0;
  const tmdb = ratings?.tmdb?.average ?? null;
  const tmdbCount = ratings?.tmdb?.count ?? 0;

  if (cinemory == null && tmdb == null) return null;

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      {cinemory != null && (
        <View className="flex-row items-center">
          <Txt variant="caption" color="mutedForeground" className={RATING_LABEL_CLASS}>
            CineMory
          </Txt>
          <RatingStars rating={cinemory} size={16} />
          {/* 서버가 소수 2자리로 준다 — ÷2 뒤 여기서 한 번만 반올림한다(이중 반올림 방지, §6). */}
          <Txt variant="h4" className="ml-2">
            {apiToStars(cinemory).toFixed(1)}
          </Txt>
          <Txt variant="caption" color="mutedForeground" className="ml-2">
            {`(${cinemoryCount.toLocaleString()}명)`}
          </Txt>
        </View>
      )}
      <ExternalRating label="TMDB" average={tmdb} count={tmdbCount} />
    </View>
  );
}
