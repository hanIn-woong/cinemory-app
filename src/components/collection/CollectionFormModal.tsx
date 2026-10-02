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
  // 생성 성공 시 호출부가 이어서 동작할 수 있도록 결과를 넘겨준다(예: 방금 만든 컬렉션에
  // 영화 바로 담기 — CollectionPickerSheet §5.4).
  onSaved?: (result: CollectionResponse) => void;
  // 있으면 수정 모드 — 컬렉션 상세 ⋮ 메뉴의 "이름·설명 수정"(2026-10-02). 없으면 생성.
  editing?: { collectionId: number; name: string; description?: string };
}

// 컬렉션 생성 + 이름·설명 수정 겸용. 영화 추가·삭제·순서는 CollectionEditScreen이 맡는다
// (2026-10-02 — 9/10에 통합했던 편집 모달을 "이름·설명"과 "영화 편집"으로 다시 나눴다,
// docs/M2C-screens-spec.md §5.3-A).
export function CollectionFormModal({ visible, onClose, onSaved, editing }: CollectionFormModalProps) {
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const isPending = createCollection.isPending || updateCollection.isPending;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setNameError(undefined);
    // editing은 열 때의 값만 쓴다 — 객체가 렌더마다 새로 만들어져도 입력 중에 되돌리지 않게 visible만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const body = { name: trimmedName, description: description.trim() || undefined };
    const callbacks = {
      onSuccess: (data: CollectionResponse) => {
        onSaved?.(data);
        onClose();
      },
      onError: (error: Error) => Alert.alert('저장 실패', error.message),
    };
    // ⚠️ 수정(PATCH)은 전체 치환이다 — 설명을 비우면 서버에서도 지워진다. 그래서 상세 화면이 라우트
    // 파라미터로 description을 들고 와 초기값을 채운다(§5.3).
    if (editing) {
      updateCollection.mutate({ collectionId: editing.collectionId, body }, callbacks);
    } else {
      createCollection.mutate(body, callbacks);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen scroll>
        <Spacer size="lg" />
        <Txt variant="h3">{editing ? '이름·설명 수정' : '컬렉션 만들기'}</Txt>
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
