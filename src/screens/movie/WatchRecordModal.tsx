import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ActionSheet, type ActionSheetOption } from '../../components/common';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useCreateRecord } from '../../hooks/useRecords';
import type { CreateRecordRequest, WatchType } from '../../types';

interface WatchRecordModalProps {
  visible: boolean;
  onClose: () => void;
  movieId: number;
}

const WATCH_TYPE_LABEL: Record<WatchType, string> = {
  THEATER: '극장',
  OTT: 'OTT',
  ETC: '기타',
};

// ⚠️ toISOString()은 UTC로 변환한 뒤 자른다 — UTC+9(KST)에서는 자정 근처 날짜가
// 하루 밀린다(8/3 선택 → 8/2로 기록). 로컬 날짜 구성요소로 직접 포맷한다.
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function WatchRecordModal({ visible, onClose, movieId }: WatchRecordModalProps) {
  const createRecord = useCreateRecord();

  const [watchDate, setWatchDate] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [watchType, setWatchType] = useState<WatchType | null>(null);
  const [placeDetail, setPlaceDetail] = useState('');
  const [rating, setRating] = useState(0); // API 스케일(0~10). 0 = 미평가
  const [note, setNote] = useState('');
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);

  function resetAndClose() {
    setWatchDate(null);
    setShowIosPicker(false);
    setWatchType(null);
    setPlaceDetail('');
    setRating(0);
    setNote('');
    onClose();
  }

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: watchDate ?? new Date(),
        mode: 'date',
        maximumDate: new Date(),
        onValueChange: (_event, date) => {
          if (date) setWatchDate(date);
        },
      });
    } else {
      setShowIosPicker((v) => !v);
    }
  }

  function handleSubmit() {
    // ⚠️ OTT는 ottPlatformId가 필수인데, 목록을 가져올 API가 아직 없다 — 목록 없이 임의 ID를
    // 보내면 잘못된 값을 지어내는 것이라 여기서 막는다. THEATER·ETC·미선택만 지금 지원한다.
    if (watchType === 'OTT') {
      Alert.alert('아직 지원하지 않아요', 'OTT 플랫폼 선택 기능은 준비 중입니다');
      return;
    }

    const body: CreateRecordRequest = {
      movieId,
      watchDate: watchDate ? toLocalDateString(watchDate) : undefined,
      watchType: watchType ?? undefined,
      placeDetail: placeDetail.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      note: note.trim() || undefined,
    };

    createRecord.mutate(body, {
      onSuccess: resetAndClose,
      onError: (error) => Alert.alert('저장 실패', error.message),
    });
  }

  const typeOptions: ActionSheetOption[] = [
    ...(Object.keys(WATCH_TYPE_LABEL) as WatchType[]).map((type) => ({
      label: WATCH_TYPE_LABEL[type],
      onPress: () => setWatchType(type),
    })),
    { label: '선택 안 함', onPress: () => setWatchType(null) },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <Screen scroll>
        <Spacer size="lg" />
        <Txt variant="h3">시청 기록 추가</Txt>
        <Spacer size="lg" />

        <Txt variant="caption" color="mutedForeground">
          관람일 (선택)
        </Txt>
        <Spacer size="xs" />
        <Pressable onPress={openDatePicker} className="h-12 justify-center rounded-md bg-input-background px-3">
          <Txt variant="body">{watchDate ? toLocalDateString(watchDate) : '기억나지 않아요'}</Txt>
        </Pressable>
        {Platform.OS === 'ios' && showIosPicker && (
          <DateTimePicker
            value={watchDate ?? new Date()}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            onValueChange={(_event, date) => {
              if (date) setWatchDate(date);
            }}
          />
        )}
        <Spacer size="md" />

        <Txt variant="caption" color="mutedForeground">
          관람 방식 (선택)
        </Txt>
        <Spacer size="xs" />
        <Pressable
          onPress={() => setTypeSheetVisible(true)}
          className="h-12 justify-center rounded-md bg-input-background px-3"
        >
          <Txt variant="body">{watchType ? WATCH_TYPE_LABEL[watchType] : '선택 안 함'}</Txt>
        </Pressable>
        {watchType === 'OTT' && (
          <>
            <Spacer size="xs" />
            <Txt variant="caption" color="destructive">
              OTT 플랫폼 선택은 아직 준비 중이에요 — 다른 방식을 골라주세요
            </Txt>
          </>
        )}
        <Spacer size="md" />

        <TextField label="장소 (선택)" value={placeDetail} onChangeText={setPlaceDetail} />
        <Spacer size="md" />

        <Txt variant="caption" color="mutedForeground">
          별점 (선택)
        </Txt>
        <Spacer size="xs" />
        <RatingStars rating={rating} onChange={setRating} />
        <Spacer size="md" />

        <TextField label="메모 (선택)" value={note} onChangeText={setNote} multiline numberOfLines={3} />

        <Spacer size="xl" />
        <View className="flex-row">
          <Button variant="secondary" onPress={resetAndClose} className="flex-1">
            취소
          </Button>
          <Spacer size="md" horizontal />
          <Button onPress={handleSubmit} loading={createRecord.isPending} className="flex-1">
            저장
          </Button>
        </View>
        <Spacer size="xl" />
      </Screen>

      <ActionSheet
        visible={typeSheetVisible}
        onClose={() => setTypeSheetVisible(false)}
        title="관람 방식"
        options={typeOptions}
      />
    </Modal>
  );
}
