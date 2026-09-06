import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../theme/tokens';

interface LoadingStateProps {
  variant?: 'list' | 'detail';
}

export function LoadingState({ variant = 'list' }: LoadingStateProps) {
  return (
    <View className={variant === 'detail' ? 'flex-1 items-center justify-center py-24' : 'items-center justify-center py-12'}>
      <ActivityIndicator color={colors.primary} size={variant === 'detail' ? 'large' : 'small'} />
    </View>
  );
}
