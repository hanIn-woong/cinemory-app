import { View } from 'react-native';
import { Button } from '../primitives/Button';
import { Spacer } from '../primitives/Spacer';
import { Txt } from '../primitives/Txt';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = '문제가 발생했습니다', onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Txt variant="body" color="mutedForeground" className="text-center">
        {message}
      </Txt>
      {onRetry && (
        <>
          <Spacer size="md" />
          <Button variant="secondary" onPress={onRetry}>
            다시 시도
          </Button>
        </>
      )}
    </View>
  );
}
