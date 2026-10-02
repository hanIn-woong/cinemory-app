import { ActivityIndicator, Pressable, View } from 'react-native';
import { Txt } from '../primitives/Txt';
import { colors } from '../../theme/tokens';

interface ReorderHeaderActionsProps {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

// 순서 편집 모드의 헤더 오른쪽 — 컬렉션 목록의 순서 편집에서 쓴다.
export function ReorderHeaderActions({ saving, onCancel, onSave }: ReorderHeaderActionsProps) {
  return (
    <View className="flex-row items-center">
      <Pressable onPress={onCancel} disabled={saving} hitSlop={8} className="mr-4">
        <Txt variant="body" color="mutedForeground">
          취소
        </Txt>
      </Pressable>
      {saving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Pressable onPress={onSave} hitSlop={8}>
          <Txt variant="body" color="primary">
            저장
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
