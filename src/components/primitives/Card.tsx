import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: ReactNode;
  padded?: boolean;
  className?: string;
}

export function Card({ children, padded = true, className, ...rest }: CardProps) {
  return (
    <View
      className={['bg-card border border-border rounded-lg', padded ? 'p-4' : '', className ?? ''].join(' ')}
      {...rest}
    >
      {children}
    </View>
  );
}
