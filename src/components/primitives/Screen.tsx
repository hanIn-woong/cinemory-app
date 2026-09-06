import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  className?: string;
}

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

export function Screen({ children, scroll = false, padded = true, edges = DEFAULT_EDGES, className }: ScreenProps) {
  const contentClassName = [padded ? 'px-4' : '', className ?? ''].join(' ');

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView className={contentClassName} contentContainerStyle={{ flexGrow: 1 }}>
          {children}
        </ScrollView>
      ) : (
        <View className={contentClassName} style={{ flex: 1 }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
