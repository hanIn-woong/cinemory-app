import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { apiToStars, starsToApi } from '../../utils/rating';

interface RatingStarsProps {
  // 항상 API 스케일(0.0~10.0)로 받는다 — 별 5개 변환은 이 컴포넌트 안에서만 한다.
  rating: number;
  onChange?: (rating: number) => void; // 있으면 입력 모드, 없으면 표시 전용
  size?: number;
}

const STAR_COUNT = 5;

export function RatingStars({ rating, onChange, size = 24 }: RatingStarsProps) {
  const filledStars = apiToStars(rating);

  function handleHalfPress(starIndex: number, half: 'left' | 'right') {
    if (!onChange) return;
    const value = half === 'left' ? starIndex + 0.5 : starIndex + 1;
    const nextApiRating = starsToApi(value);
    // 같은 별을 다시 누르면 해제한다 — 0점으로 되돌릴 방법이 필요하다 (§4.1).
    onChange(nextApiRating === rating ? 0 : nextApiRating);
  }

  return (
    <View className="flex-row">
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const fill = Math.max(0, Math.min(1, filledStars - i));
        return (
          <View key={i} style={{ width: size, height: size }}>
            <Star size={size} color={colors.mutedForeground} />
            <View style={{ position: 'absolute', width: size * fill, height: size, overflow: 'hidden' }}>
              <Star size={size} color={colors.star} fill={colors.star} />
            </View>
            {onChange && (
              <View className="absolute inset-0 flex-row">
                <Pressable className="flex-1" onPress={() => handleHalfPress(i, 'left')} hitSlop={4} />
                <Pressable className="flex-1" onPress={() => handleHalfPress(i, 'right')} hitSlop={4} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
