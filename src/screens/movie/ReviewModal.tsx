import { useEffect, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useWriteReview } from '../../hooks/useReview';
import type { ReviewResponse } from '../../types';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  movieId: number;
  // 있으면 수정(값 미리 채움), 없으면 새로 작성 — 어느 쪽이든 PUT upsert다.
  initial: ReviewResponse | null;
}

export function ReviewModal({ visible, onClose, movieId, initial }: ReviewModalProps) {
  const writeReview = useWriteReview(movieId);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (visible) {
      setRating(initial?.rating ?? 0);
      setContent(initial?.content ?? '');
    }
  }, [visible, initial]);

  function handleSubmit() {
    if (rating <= 0) {
      Alert.alert('별점을 선택해 주세요');
      return;
    }
    if (content.trim().length === 0) {
      Alert.alert('리뷰 내용을 입력해 주세요');
      return;
    }
    writeReview.mutate(
      { rating, content: content.trim() },
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
        <Spacer size="lg" />

        <Txt variant="caption" color="mutedForeground">
          별점
        </Txt>
        <Spacer size="xs" />
        <RatingStars rating={rating} onChange={setRating} />
        <Spacer size="md" />

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
