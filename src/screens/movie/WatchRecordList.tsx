import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { ActionSheet, type ActionSheetOption } from '../../components/common';
import { RatingStars } from '../../components/movie/RatingStars';
import { Spacer, Txt } from '../../components/primitives';
import { useDeleteRecord, useSetRepresentative } from '../../hooks/useRecords';
import { useAuthStore } from '../../store/authStore';
import type { WatchRecordResponse, WatchType } from '../../types';
import { WatchRecordModal } from './WatchRecordModal';

const WATCH_TYPE_LABEL: Record<WatchType, string> = {
  THEATER: '극장',
  OTT: 'OTT',
  ETC: '기타',
};

interface WatchRecordListProps {
  movieId: number;
  // 이 영화의 내 시청 기록 전체(id DESC — useWatchLog 그대로). limit이 있어도 전체를 넘긴다 —
  // 수정 시 "이전 회차보다 앞선 날짜 금지"를 화면에 안 보이는 회차까지 보고 정해야 한다.
  records: WatchRecordResponse[];
  // 앞에서부터 몇 개만 그린다(영화 상세). 없으면 전부(시청 기록 전체 화면).
  limit?: number;
  // 대표 기록을 맨 위로 올린다(영화 상세, 2026-10-03). 나머지 순서는 그대로. 전체 화면은 시간순 그대로 둔다.
  pinRepresentative?: boolean;
}

// 시청 기록 회차 목록 — 영화 상세(최근 5개)와 시청 기록 전체 화면(WatchLog)이 같이 쓴다(2026-10-03,
// docs/M2B-screens-spec.md §5.4). 행을 탭하면 수정 / 대표 기록으로 지정 / 삭제 시트가 열리고, 수정은 여기 둔
// WatchRecordModal로 한다. 새 기록 추가는 이 목록 몫이 아니다(상세 화면의 "시청 기록 추가").
export function WatchRecordList({ movieId, records, limit, pinRepresentative = false }: WatchRecordListProps) {
  const myId = useAuthStore((s) => s.user?.id);
  const deleteRecord = useDeleteRecord();
  const setRepresentative = useSetRepresentative();

  const [sheetRecord, setSheetRecord] = useState<WatchRecordResponse | null>(null);
  const [editingRecord, setEditingRecord] = useState<WatchRecordResponse | null>(null);
  const [editingMinDate, setEditingMinDate] = useState<string | null>(null);

  // 회차는 만든 순서로 센다 — records가 id DESC라 뒤에서부터 1회차. 표시 순서(대표 올림)와 무관하게 원래 목록 기준이다.
  // 수정 시 "이전 회차보다 앞선 날짜 금지"가 있어 만든 순서가 곧 본 순서다.
  const episodeOf = new Map(records.map((r, i) => [r.id, records.length - i]));
  const ordered = pinRepresentative
    ? [...records.filter((r) => r.representative), ...records.filter((r) => !r.representative)]
    : records;
  const shown = limit == null ? ordered : ordered.slice(0, limit);

  function sheetOptions(record: WatchRecordResponse): ActionSheetOption[] {
    const options: ActionSheetOption[] = [
      {
        label: '수정',
        onPress: () => {
          // 이전 회차들(먼저 본 회차) 중 날짜가 있는 가장 가까운 것보다 앞선 날짜로는
          // 못 고치게 막는다. 목록은 id DESC(최신 생성 순)라 "이전"은 배열상 뒤쪽이고,
          // 그 구간에서 날짜 없는 회차는 건너뛰고 날짜 있는 첫 회차를 찾는다.
          const index = records.findIndex((r) => r.id === record.id);
          const previousWithDate =
            index >= 0 ? records.slice(index + 1).find((r) => r.watchDate != null) : undefined;
          setEditingRecord(record);
          setEditingMinDate(previousWithDate?.watchDate ?? null);
        },
      },
    ];
    if (!record.representative) {
      options.push({
        label: '대표 기록으로 지정',
        onPress: () =>
          setRepresentative.mutate(
            { recordId: record.id!, userId: myId!, movieId },
            { onError: (error) => Alert.alert('실패', error.message) },
          ),
      });
    }
    options.push({
      label: '삭제',
      destructive: true,
      onPress: () => deleteRecord.mutate(record.id!, { onError: (error) => Alert.alert('실패', error.message) }),
    });
    return options;
  }

  return (
    <>
      {shown.map((record) => (
        <Pressable key={record.id} onPress={() => setSheetRecord(record)} className="py-2">
          <View className="flex-row items-center justify-between">
            <Txt variant="body">
              {/* 회차를 맨 앞에 — 날짜 유무와 상관없이 줄의 첫머리가 같다(2026-10-03, "날짜 미기록" 대체).
                  한 번만 본 영화는 회차가 의미 없어 빼고, 그때 날짜도 없으면 첫머리가 비지 않게 "날짜 미기록". */}
              {records.length > 1
                ? `${episodeOf.get(record.id)}회차${record.watchDate ? ` · ${record.watchDate}` : ''}`
                : (record.watchDate ?? '날짜 미기록')}
              {record.watchType ? ` · ${WATCH_TYPE_LABEL[record.watchType]}` : ''}
              {record.watchType === 'OTT' && record.ottPlatform?.name ? ` · ${record.ottPlatform.name}` : ''}
              {record.placeDetail ? ` · ${record.placeDetail}` : ''}
              {/* 하나뿐이면 그게 곧 대표라 표시가 의미 없다(회차 생략과 같은 이유) */}
              {record.representative && records.length > 1 ? ' · 대표' : ''}
            </Txt>
          </View>
          {record.privateReview && (
            <>
              <Spacer size="xs" />
              <Txt variant="caption" color="mutedForeground">
                {record.privateReview}
              </Txt>
            </>
          )}
          {record.rating != null && (
            <>
              <Spacer size="xs" />
              <RatingStars rating={record.rating} size={16} />
            </>
          )}
        </Pressable>
      ))}

      <ActionSheet
        visible={sheetRecord != null}
        onClose={() => setSheetRecord(null)}
        options={sheetRecord ? sheetOptions(sheetRecord) : []}
      />
      <WatchRecordModal
        visible={editingRecord != null}
        onClose={() => {
          setEditingRecord(null);
          setEditingMinDate(null);
        }}
        movieId={movieId}
        editing={editingRecord}
        minDate={editingMinDate}
      />
    </>
  );
}
