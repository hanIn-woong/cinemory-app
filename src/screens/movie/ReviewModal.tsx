import { useEffect, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useWriteReview } from '../../hooks/useReview';
import type { ReviewResponse } from '../../types';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  movieId: number;
  // 있으면 수정(내용만 미리 채움), 없으면 새로 작성 — 어느 쪽이든 PUT upsert다.
  initial: ReviewResponse | null;
}

// ⚠️ 별점은 여기 없다 — watch_record.rating이 단일 출처다(docs/M2-frontend-spec.md §7.3,
// 2026-09-01 확정). 리뷰에 표시되는 별점은 대표 시청 기록에서 파생된 값이라 여기서 입력받지 않는다.
export function ReviewModal({ visible, onClose, movieId, initial }: ReviewModalProps) {
  const writeReview = useWriteReview(movieId);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (visible) {
      setContent(initial?.content ?? '');
    }
  }, [visible, initial]);

  function handleSubmit() {
    if (content.trim().length === 0) {
      Alert.alert('리뷰 내용을 입력해 주세요');
      return;
    }
    writeReview.mutate(
      { content: content.trim() },
      {
        onSuccess: onClose,
        onError: (error) => Alert.alert('저장 실패', error.message),
      },
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen scroll>
        <Spacer size="lg" />
        <Txt variant="h3">{initial ? '리뷰 수정' : '리뷰 쓰기'}</Txt>
        <Spacer size="xs" />
        <Txt variant="caption" color="mutedForeground">
          별점은 내 시청 기록의 별점이 함께 표시됩니다
        </Txt>
        <Spacer size="lg" />

        <TextField
          label="리뷰"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Spacer size="xl" />
        <View className="flex-row">
          <Button variant="secondary" onPress={onClose} className="flex-1">
            취소
          </Button>
          <Spacer size="md" horizontal />
          <Button onPress={handleSubmit} loading={writeReview.isPending} className="flex-1">
            저장
          </Button>
        </View>
        <Spacer size="xl" />
      </Screen>
    </Modal>
  );
}
