import { useEffect, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useCreateCollection, useUpdateCollection } from '../../hooks/useCollection';
import type { CollectionResponse } from '../../types';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 500;

interface CollectionFormModalProps {
  visible: boolean;
  onClose: () => void;
  // 있으면 수정 모드(PATCH, 전체 치환), 없으면 새로 작성(POST).
  editing?: { collectionId: number; name: string; description?: string | null } | null;
  // 수정 성공 시 호출부가 라우트 파라미터 등 화면 상태를 갱신할 수 있도록 결과를 넘겨준다.
  onSaved?: (result: CollectionResponse) => void;
}

// 생성/수정 겸용 — 초기값만 다르다(WatchRecordModal과 같은 패턴, docs/M2C-screens-spec.md §4).
export function CollectionFormModal({ visible, onClose, editing, onSaved }: CollectionFormModalProps) {
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setNameError(undefined);
  }, [visible, editing]);

  const isPending = editing ? updateCollection.isPending : createCollection.isPending;

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

    // ⚠️ CollectionUpdateRequest는 전체 치환이다 — name은 @NotBlank라 생략하면 400,
    // description을 생략하면 조용히 지워진다. 두 필드를 항상 같이 보낸다.
    const body = { name: trimmedName, description: description.trim() || undefined };

    if (editing) {
      updateCollection.mutate(
        { collectionId: editing.collectionId, body },
        {
          onSuccess: (data) => {
            onSaved?.(data);
            onClose();
          },
          onError: (error) => Alert.alert('저장 실패', error.message),
        },
      );
    } else {
      createCollection.mutate(body, {
        onSuccess: (data) => {
          onSaved?.(data);
          onClose();
        },
        onError: (error) => Alert.alert('저장 실패', error.message),
      });
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen scroll>
        <Spacer size="lg" />
        <Txt variant="h3">{editing ? '컬렉션 수정' : '컬렉션 만들기'}</Txt>
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
          <Button onPress={handleSubmit} loading={isPending} className="flex-1">
            저장
          </Button>
        </View>
        <Spacer size="xl" />
      </Screen>
    </Modal>
  );
}
