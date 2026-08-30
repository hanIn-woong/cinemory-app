import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import { Txt } from '../primitives/Txt';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="h-14 flex-row items-center border-b border-border bg-background px-2"
    >
      <View className="w-10 items-start justify-center">
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
        )}
      </View>
      <View className="flex-1 items-center">
        <Txt variant="h4" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      <View className="w-10 items-end justify-center">{right}</View>
    </View>
  );
}
