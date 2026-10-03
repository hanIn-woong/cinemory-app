import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ActionSheet, type ActionSheetOption } from '../../components/common';
import { RatingStars } from '../../components/movie/RatingStars';
import { Button, Screen, Spacer, TextField, Txt } from '../../components/primitives';
import { useOttPlatforms } from '../../hooks/useOttPlatforms';
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
  const ottPlatforms = useOttPlatforms();
  const minDateObj = minDate ? parseLocalDateString(minDate) : undefined;

  const [watchDate, setWatchDate] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [watchType, setWatchType] = useState<WatchType | null>(null);
  const [ottPlatformId, setOttPlatformId] = useState<number | null>(null);
  const [placeDetail, setPlaceDetail] = useState('');
  const [rating, setRating] = useState(0); // API 스케일(0~10). 0 = 미평가
  const [note, setNote] = useState('');
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [platformSheetVisible, setPlatformSheetVisible] = useState(false);

  // 열릴 때마다 수정 대상 값으로 채우거나(수정 모드) 비운다(새 작성).
  useEffect(() => {
    if (!visible) return;
    setShowIosPicker(false);
    setWatchDate(editing?.watchDate ? parseLocalDateString(editing.watchDate) : null);
    setWatchType(editing?.watchType ?? null);
    setOttPlatformId(editing?.ottPlatform?.id ?? null);
    setPlaceDetail(editing?.placeDetail ?? '');
    setRating(editing?.rating ?? 0);
    setNote(editing?.privateReview ?? '');
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
    // 서버 규칙(watchType=OTT ⇔ ottPlatformId 필수)을 클라이언트에서 먼저 막는다 —
    // 400보다 친절하다(docs/ott-record-spec.md O-4).
    if (watchType === 'OTT' && ottPlatformId == null) {
      Alert.alert('OTT 플랫폼을 선택해 주세요');
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
      // OTT가 아니면 절대 싣지 않는다 — watchType 변경 시 상태를 비우지만(O-3), 전송
      // 직전에도 한 번 더 보장한다(docs/ott-record-spec.md 2-3 ⑦).
      ottPlatformId: watchType === 'OTT' ? ottPlatformId ?? undefined : undefined,
      rating: rating > 0 ? rating : undefined,
      privateReview: note.trim() || undefined,
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

  // 목록이 비어 있거나 조회 실패면 플랫폼 시트를 열지 않고 안내한다(O-8) — 운영 초기
  // ott_platform 이관 누락 같은 상황에서 저장 불가 상태로 갇히지 않게.
  function openPlatformSheet() {
    if (ottPlatforms.isError || ottPlatforms.data?.length === 0) {
      Alert.alert('OTT 플랫폼 목록을 불러올 수 없어요', '잠시 후 다시 시도해 주세요');
      return;
    }
    setPlatformSheetVisible(true);
  }

  const typeOptions: ActionSheetOption[] = [
    ...(Object.keys(WATCH_TYPE_LABEL) as WatchType[]).map((type) => ({
      label: WATCH_TYPE_LABEL[type],
      onPress: () => {
        if (type === 'OTT') {
          if (ottPlatforms.isError || ottPlatforms.data?.length === 0) {
            Alert.alert('OTT 플랫폼 목록을 불러올 수 없어요', '잠시 후 다시 시도해 주세요');
            return;
          }
          setWatchType('OTT');
          // 시트 두 개가 동시에 전환되면 Android에서 두 번째가 뜨지 않는 경우가 있다 —
          // 첫 시트(ActionSheet)가 닫힌 뒤에 연다(docs/ott-record-spec.md 2-3 ③).
          setTimeout(() => setPlatformSheetVisible(true), 0);
          return;
        }
        setWatchType(type);
        setOttPlatformId(null); // OTT가 아니면 즉시 비운다(O-3) — 안 비우면 저장 규칙 위반(400)
      },
    })),
    {
      label: '선택 안 함',
      onPress: () => {
        setWatchType(null);
        setOttPlatformId(null);
      },
    },
  ];

  const platformOptions: ActionSheetOption[] = (ottPlatforms.data ?? []).map((platform) => ({
    label: platform.name + (platform.id === ottPlatformId ? ' (현재)' : ''),
    onPress: () => setOttPlatformId(platform.id),
  }));

  // 목록에서 찾은 이름 → (목록에 없으면) 수정 대상 기록의 이름(O-6, 비활성화된 플랫폼) →
  // 둘 다 없으면 안내 문구.
  const platformLabel =
    ottPlatforms.data?.find((p) => p.id === ottPlatformId)?.name ?? editing?.ottPlatform?.name ?? '선택해 주세요';

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
            <Spacer size="md" />
            <Txt variant="caption" color="mutedForeground">
              OTT 플랫폼
            </Txt>
            <Spacer size="xs" />
            <Pressable
              onPress={openPlatformSheet}
              className="h-12 justify-center rounded-md bg-input-background px-3"
            >
              <Txt variant="body">{platformLabel}</Txt>
            </Pressable>
          </>
        )}
        <Spacer size="md" />

        <TextField label="장소 (선택)" value={placeDetail} onChangeText={setPlaceDetail} />
        <Spacer size="md" />

        <Txt variant="caption" color="mutedForeground">
          별점 (선택)
        </Txt>
        <Spacer size="xs" />
        {/* 기본 24는 손가락으로 반 별을 고르기에 작았다(2026-10-03) — 상세 상단(40)보다는 작게 */}
        <RatingStars rating={rating} onChange={setRating} size={32} />
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
      <ActionSheet
        visible={platformSheetVisible}
        onClose={() => setPlatformSheetVisible(false)}
        title="OTT 플랫폼"
        options={platformOptions}
      />
    </Modal>
  );
}
