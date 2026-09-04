import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ActionSheet, type ActionSheetOption } from '../../components/common';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useCreateRecord, useUpdateRecord } from '../../hooks/useRecords';
import type { CreateRecordRequest, UpdateRecordRequest, WatchRecordResponse, WatchType } from '../../types';

interface WatchRecordModalProps {
  visible: boolean;
  onClose: () => void;
  movieId: number;
  // 있으면 수정 모드(값 미리 채움 + PATCH), 없으면 새로 작성(POST).
  editing?: WatchRecordResponse | null;
  // 바로 이전 회차(더 먼저 본 회차)의 날짜 — 있으면 그보다 이전 날짜는 선택·저장을 막는다.
  // 이전 회차가 없거나 그 회차에 날짜가 없으면 제약 없음.
  minDate?: string | null;
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

// toLocalDateString의 역변환 — new Date('YYYY-MM-DD')는 UTC 자정으로 해석돼 UTC보다
// 뒤처진 타임존에서는 하루 앞으로 당겨질 수 있다. 로컬 구성요소로 직접 만든다.
function parseLocalDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function WatchRecordModal({ visible, onClose, movieId, editing, minDate }: WatchRecordModalProps) {
  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  const minDateObj = minDate ? parseLocalDateString(minDate) : undefined;

  const [watchDate, setWatchDate] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [watchType, setWatchType] = useState<WatchType | null>(null);
  const [placeDetail, setPlaceDetail] = useState('');
  const [rating, setRating] = useState(0); // API 스케일(0~10). 0 = 미평가
  const [note, setNote] = useState('');
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);

  // 열릴 때마다 수정 대상 값으로 채우거나(수정 모드) 비운다(새 작성).
  useEffect(() => {
    if (!visible) return;
    setShowIosPicker(false);
    setWatchDate(editing?.watchDate ? parseLocalDateString(editing.watchDate) : null);
    setWatchType(editing?.watchType ?? null);
    setPlaceDetail(editing?.placeDetail ?? '');
    setRating(editing?.rating ?? 0);
    setNote(editing?.note ?? '');
  }, [visible, editing]);

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: watchDate ?? new Date(),
        mode: 'date',
        maximumDate: new Date(),
        minimumDate: minDateObj,
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

    // ⚠️ 이전 회차보다 먼저 봤다고 기록할 수 없다 — 피커의 minimumDate가 1차 방어,
    // 이건 그걸 우회할 수 있는 경로(예: 피커가 막지 못하는 플랫폼 동작)를 위한 2차 방어다.
    if (watchDate && minDateObj && watchDate < minDateObj) {
      Alert.alert('날짜를 확인해 주세요', `${toLocalDateString(minDateObj)} 이후로 선택해 주세요 (이전 회차 관람일)`);
      return;
    }

    const fields = {
      watchDate: watchDate ? toLocalDateString(watchDate) : undefined,
      watchType: watchType ?? undefined,
      placeDetail: placeDetail.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      note: note.trim() || undefined,
    };

    if (editing) {
      // ⚠️ PATCH /api/records/{id}는 전체 치환이다 — 생략한 필드는 null로 지워진다(B-15).
      // 위 fields가 이미 폼의 전체 상태이므로 그대로 보내면 된다.
      const body: UpdateRecordRequest = fields;
      updateRecord.mutate(
        { recordId: editing.id!, movieId, body },
        { onSuccess: onClose, onError: (error) => Alert.alert('저장 실패', error.message) },
      );
    } else {
      const body: CreateRecordRequest = { movieId, ...fields };
      createRecord.mutate(body, {
        onSuccess: onClose,
        onError: (error) => Alert.alert('저장 실패', error.message),
      });
    }
  }

  const typeOptions: ActionSheetOption[] = [
    ...(Object.keys(WATCH_TYPE_LABEL) as WatchType[]).map((type) => ({
      label: WATCH_TYPE_LABEL[type],
      onPress: () => setWatchType(type),
    })),
    { label: '선택 안 함', onPress: () => setWatchType(null) },
  ];

  const isPending = editing ? updateRecord.isPending : createRecord.isPending;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen scroll>
        <Spacer size="lg" />
        <Txt variant="h3">{editing ? '시청 기록 수정' : '시청 기록 추가'}</Txt>
        <Spacer size="lg" />

        <Txt variant="caption" color="mutedForeground">
          관람일 (선택)
        </Txt>
        <Spacer size="xs" />
        <View className="flex-row items-center">
          <Pressable
            onPress={openDatePicker}
            className="h-12 flex-1 justify-center rounded-md bg-input-background px-3"
          >
            <Txt variant="body">{watchDate ? toLocalDateString(watchDate) : '기억나지 않아요'}</Txt>
          </Pressable>
          {watchDate && (
            <>
              <Spacer size="sm" horizontal />
              <Pressable onPress={() => setWatchDate(null)} hitSlop={8} className="px-2 py-3">
                <Txt variant="caption" color="primary">
                  지우기
                </Txt>
              </Pressable>
            </>
          )}
        </View>
        {minDateObj && (
          <>
            <Spacer size="xs" />
            <Txt variant="caption" color="mutedForeground">
              이전 회차({toLocalDateString(minDateObj)}) 이후만 선택할 수 있어요
            </Txt>
          </>
        )}
        {Platform.OS === 'ios' && showIosPicker && (
          <DateTimePicker
            value={watchDate ?? new Date()}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            minimumDate={minDateObj}
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

      <ActionSheet
        visible={typeSheetVisible}
        onClose={() => setTypeSheetVisible(false)}
        title="관람 방식"
        options={typeOptions}
      />
    </Modal>
  );
}
