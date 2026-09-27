import { ArrowUpDown } from 'lucide-react-native';
import { Pressable } from 'react-native';
import type { SortOption } from '../../constants/librarySort';
import { colors } from '../../theme/tokens';
import { Txt } from '../primitives/Txt';
import { ActionSheet } from './ActionSheet';

interface SortSheetProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// 목록 정렬 선택 — 새 모달 인프라를 만들지 않고 ActionSheet를 재사용한다
// (docs/library-sort-spec.md §2.2). 목록마다 다른 옵션 배열을 넘긴다.
export function SortSheet<T extends string>({ visible, onClose, options, value, onChange }: SortSheetProps<T>) {
  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title="정렬"
      options={options.map((option) => ({
        label: option.label,
        selected: option.value === value,
        onPress: () => {
          if (option.value !== value) onChange(option.value);
        },
      }))}
    />
  );
}

interface SortButtonProps<T extends string> {
  options: SortOption<T>[];
  value: T;
  onPress: () => void;
}

// 툴바의 `⇅ 최근순` — 현재 정렬을 레이블로도 드러낸다(§2.2).
export function SortButton<T extends string>({ options, value, onPress }: SortButtonProps<T>) {
  const label = options.find((option) => option.value === value)?.label ?? '';
  return (
    <Pressable onPress={onPress} hitSlop={8} className="flex-row items-center">
      <ArrowUpDown size={14} color={colors.mutedForeground} />
      <Txt variant="caption" className="ml-1">
        {label}
      </Txt>
    </Pressable>
  );
}
