import { View } from 'react-native';
import { Inbox, type LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { Button } from '../primitives/Button';
import { Spacer } from '../primitives/Spacer';
import { Txt } from '../primitives/Txt';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: EmptyStateAction;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Icon size={40} color={colors.mutedForeground} />
      <Spacer size="md" />
      <Txt variant="h4" className="text-center">
        {title}
      </Txt>
      {description && (
        <>
          <Spacer size="xs" />
          <Txt variant="caption" color="mutedForeground" className="text-center">
            {description}
          </Txt>
        </>
      )}
      {action && (
        <>
          <Spacer size="lg" />
          <Button variant="primary" onPress={action.onPress}>
            {action.label}
          </Button>
        </>
      )}
    </View>
  );
}
