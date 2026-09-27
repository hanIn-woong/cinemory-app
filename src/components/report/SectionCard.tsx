import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Card } from '../primitives/Card';
import { Spacer } from '../primitives/Spacer';
import { Txt } from '../primitives/Txt';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  // 오른쪽에 보조 정보를 붙일 때(예: classicCount 강조 숫자) 쓴다.
  headerRight?: ReactNode;
}

// 리포트 10개 섹션의 공통 껍데기(docs/M2C2-report-spec.md §4.2).
export function SectionCard({ title, children, headerRight }: SectionCardProps) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Txt variant="h4">{title}</Txt>
        {headerRight}
      </View>
      <Spacer size="md" />
      {children}
    </Card>
  );
}
