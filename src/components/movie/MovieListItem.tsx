import { Pressable, View } from 'react-native';
import { Txt } from '../primitives/Txt';
import { PosterImage } from './PosterImage';

interface MovieListItemProps {
  id: number;
  title: string;
  posterPath?: string | null;
  releaseDate?: string | null;
  // 장르 등 부가 정보 — 응답에 없으면 생략한다(§4 표: 응답마다 구성이 다르다).
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export function MovieListItem({ id, title, posterPath, releaseDate, subtitle, onPress, onLongPress }: MovieListItemProps) {
  const year = releaseDate ? releaseDate.slice(0, 4) : undefined;
  const meta = [year, subtitle].filter(Boolean).join(' · ');

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} className="flex-row items-center py-2">
      <PosterImage id={id} posterPath={posterPath} width={80} height={112} />
      <View className="ml-3 flex-1">
        <Txt variant="h4" numberOfLines={2}>
          {title}
        </Txt>
        {meta.length > 0 && (
          <Txt variant="caption" color="mutedForeground" className="mt-1">
            {meta}
          </Txt>
        )}
      </View>
    </Pressable>
  );
}