import { useEffect, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useCreateCollection } from '../../hooks/useCollection';
import type { CollectionResponse } from '../../types';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;

interface CollectionFormModalProps {
  visible: boolean;
  onClose: () => void;
  // 생성 성공 시 호출부가 이어서 동작할 수 있도록 결과를 넘겨준다(예: 방금 만든 컬렉션에
  // 영화 바로 담기 — CollectionPickerSheet §5.4).
  onSaved?: (result: CollectionResponse) => void;
}

// 컬렉션 생성 전용 — 수정은 CollectionEditModal이 맡는다(2026-09-10, 실기기 검증 피드백으로
// 이름/설명 편집과 영화 추가·제거를 한 화면에 통합하면서 분리했다).
export function CollectionFormModal({ visible, onClose, onSaved }: CollectionFormModalProps) {
  const createCollection = useCreateCollection();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setName('');
    setDescription('');
    setNameError(undefined);
  }, [visible]);

  function handleSubmit() {
    const trimmedName = name.trim();
    // C-6·C-7 — 이름 51자·설명 501자·빈 이름은 클라이언트에서 막는다(@NotBlank·길이 제약).
    if (!trimmedName) {
      setNameError('컬렉션 이름을 입력해 주세요');
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setNameError(`이름은 ${NAME_MAX}자 이내로 입력해 주세요`);
      return;
    }
    if (description.length > DESCRIPTION_MAX) {
      Alert.alert('설명이 너무 길어요', `설명은 ${DESCRIPTION_MAX}자 이내로 입력해 주세요`);
      return;
    }
    setNameError(undefined);

    createCollection.mutate(
      { name: trimmedName, description: description.trim() || undefined },
      {
        onSuccess: (data) => {
          onSaved?.(data);
          onClose();
        },
        onError: (error) => Alert.alert('저장 실패', error.message),
      },
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen scroll>
        <Spacer size="lg" />
        <Txt variant="h3">컬렉션 만들기</Txt>
        <Spacer size="lg" />

        <TextField
          label="이름"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
          maxLength={NAME_MAX + 1}
          placeholder="예: 봐야 할 영화"
        />
        <Spacer size="md" />

        <TextField
          label="설명 (선택)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={DESCRIPTION_MAX + 1}
          placeholder="이 컬렉션에 대한 설명을 남겨보세요"
        />

        <Spacer size="xl" />
        <View className="flex-row">
          <Button variant="secondary" onPress={onClose} className="flex-1">
            취소
          </Button>
          <Spacer size="md" horizontal />
          <Button onPress={handleSubmit} loading={createCollection.isPending} className="flex-1">
            저장
          </Button>
        </View>
        <Spacer size="xl" />
      </Screen>
    </Modal>
  );
}
