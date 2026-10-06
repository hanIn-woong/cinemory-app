import { View } from 'react-native';
import { PersonAvatar } from '../movie/PersonAvatar';
import { Txt } from '../primitives/Txt';
import { colors } from '../../theme/tokens';
import { RankRow } from './RankRow';

// 리포트의 인물 항목 — 생성 타입(PersonRankItemResponse, 백엔드 4-8-I)을 그대로 받을 수 있게 구조적으로 둔다.
// profilePath가 없는 응답(PreferenceItemResponse)도 받을 수 있어, 사진이 없으면 폴백 아이콘이 나온다.
export interface PersonRankItem {
  id?: number;
  name?: string;
  count?: number;
  profilePath?: string | null;
}

// 서버의 인물 TOP 상한(TOP_ACTOR_DIRECTOR_LIMIT)과 같다 — 장르·국가의 5와 다르다(§10.3).
const PERSON_LIMIT = 3;
const LEADER_AVATAR = 56;
const BADGE = 22;

// 누적 리포트 선호 TOP의 감독·배우 — 1위 강조 박스 + 2~3위 목록(docs/M2C2-report-spec.md §10.3, 시안 D2).
// ⚠️ score 정렬이라 "N편"이 순서와 어긋날 수 있다 — 1위 박스도 섹션 상단의 정렬 기준 문구를 따른다.
export function PersonRankGroup({ title, items }: { title: string; items?: PersonRankItem[] }) {
  if (!items || items.length === 0) return null;
  const [leader, ...rest] = items.slice(0, PERSON_LIMIT);
  return (
    <View className="mb-3">
      <Txt variant="caption" color="mutedForeground" className="mb-1">
        {title}
      </Txt>
      <View className="flex-row items-center rounded-md bg-brand-light px-3 py-[10px]">
        <View>
          <PersonAvatar profilePath={leader.profilePath ?? null} size={LEADER_AVATAR} />
          {/* 박스 배경색 테두리로 사진과 분리한다 */}
          <View
            className="absolute items-center justify-center rounded-full bg-primary"
            style={{ right: -4, bottom: -4, width: BADGE, height: BADGE, borderWidth: 2, borderColor: colors.brandLight }}
          >
            <Txt variant="caption" color="foreground" className="font-bold">
              1
            </Txt>
          </View>
        </View>
        <View className="ml-3 flex-1">
          <Txt variant="h4" numberOfLines={1}>
            {leader.name}
          </Txt>
          {leader.count != null && <Txt variant="caption">{`${leader.count}편`}</Txt>}
        </View>
      </View>
      {rest.map((item, i) => (
        <RankRow
          key={item.id ?? i}
          rank={i + 2}
          label={item.name ?? ''}
          meta={item.count != null ? `${item.count}편` : undefined}
          avatarPath={item.profilePath ?? null}
        />
      ))}
    </View>
  );
}
