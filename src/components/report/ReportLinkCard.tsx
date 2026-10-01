import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { colors, radius } from '../../theme/tokens';
import { Spacer } from '../primitives/Spacer';
import { Txt } from '../primitives/Txt';

interface ReportLinkCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
  // 화면의 주인공이 아닌 곳(캘린더)에서 쓰는 작은 크기.
  compact?: boolean;
}

const SIZE = {
  regular: { padX: 20, padY: 24, icon: 26, title: 'h3', chevron: 22, gap: 'ml-3' },
  compact: { padX: 16, padY: 14, icon: 20, title: 'h4', chevron: 18, gap: 'ml-2' },
} as const;

// 리포트로 들어가는 브랜드 그라디언트 박스 — 마이페이지(시청 분석 리포트)와 캘린더(이달의 리포트)가
// 같은 모양을 쓴다.
export function ReportLinkCard({ icon: Icon, title, description, onPress, compact = false }: ReportLinkCardProps) {
  const size = compact ? SIZE.compact : SIZE.regular;
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={[colors.primary, colors.brandDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        // LinearGradient에는 className의 rounded가 먹지 않는다 — style로 직접 준다.
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
          paddingHorizontal: size.padX,
          paddingVertical: size.padY,
        }}
      >
        {/* 쉐브런은 제목 줄이 아니라 박스(제목+설명) 전체의 세로 중앙에 둔다. */}
        <View className="flex-row items-center">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Icon size={size.icon} color={colors.primaryForeground} />
              <Txt variant={size.title} color="primaryForeground" className={size.gap}>
                {title}
              </Txt>
            </View>
            <Spacer size="xs" />
            <Txt variant="caption" color="primaryForeground" className="opacity-80">
              {description}
            </Txt>
          </View>
          <ChevronRight size={size.chevron} color={colors.primaryForeground} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
