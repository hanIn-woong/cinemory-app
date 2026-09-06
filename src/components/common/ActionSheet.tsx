import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Divider } from '../primitives/Divider';
import { Txt } from '../primitives/Txt';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

export function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <View
          className="mt-auto rounded-t-xl bg-card"
          style={{ paddingBottom: insets.bottom }}
          onStartShouldSetResponder={() => true}
        >
          {title && (
            <View className="px-4 py-3">
              <Txt variant="caption" color="mutedForeground">
                {title}
              </Txt>
            </View>
          )}
          {options.map((option, index) => (
            <View key={option.label}>
              {index > 0 && <Divider />}
              <Pressable
                className="px-4 py-4"
                onPress={() => {
                  option.onPress();
                  onClose();
                }}
              >
                <Txt variant="body" color={option.destructive ? 'destructive' : 'foreground'}>
                  {option.label}
                </Txt>
              </Pressable>
            </View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
