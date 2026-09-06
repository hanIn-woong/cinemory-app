import { View } from 'react-native';
import { spacing } from '../../theme/tokens';

interface SpacerProps {
  size: keyof typeof spacing;
  horizontal?: boolean;
}

export function Spacer({ size, horizontal = false }: SpacerProps) {
  const value = spacing[size];
  return <View style={horizontal ? { width: value } : { height: value }} />;
}
