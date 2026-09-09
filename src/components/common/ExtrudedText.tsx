import { Text, View, type TextStyle } from 'react-native';

interface Direction {
  dx: number;
  dy: number;
}

interface ExtrudedTextProps {
  children: string;
  style: TextStyle;
  extrudeColor: string;
  keylineColor: string;
  // 압출 방향 — 기본은 ↘(우하단) 한 방향. 컴포넌트에 박지 않고 prop으로 열어 둔다.
  direction?: Direction;
  // 생략하면 fontSize 비율로 계산한다. 값을 직접 주면 그 값을 그대로 쓴다.
  depth?: number;
}

const DEFAULT_DIRECTION: Direction = { dx: 1, dy: 1 }; // ↘

// ⚠️ 깊이는 px 상수로 박지 않는다 — fontSize에 비례해야 스플래시·로그인처럼 더 작게
// 쓰는 곳에서도 비율이 유지된다. 최소 2겹은 보장한다 — 1겹이 되면 압출이 아니라
// 그냥 드롭섀도로 보인다(docs/M2-frontend-spec.md §9.1, 2026-09-09 개정).
function resolveDepth(style: TextStyle, override?: number): number {
  if (override != null) return override;
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 16;
  return Math.max(2, Math.round(fontSize * 0.055));
}

// 입체 압출 타이포 — 한 방향(기본 ↘)으로 1px씩 연속으로 쌓아 진짜 압출처럼 보이게 한다.
// 이전 OutlinedText(4방향 대칭 아웃라인)를 대체한다 — 4방향은 깊이 방향이 없어 압출이
// 아니라 오프셋 인쇄 오차로 보였다(§9.1 2026-09-09 개정 근거).
//
// 레이어 구성(맨 뒤 → 맨 앞): 키라인 1겹(`keylineColor`, 오프셋 depth+1) → 압출 depth겹
// (`extrudeColor`, 오프셋 1~depth) → 본체 1겹(`style.color`, 오프셋 0).
export function ExtrudedText({ children, style, extrudeColor, keylineColor, direction = DEFAULT_DIRECTION, depth: depthOverride }: ExtrudedTextProps) {
  const depth = resolveDepth(style, depthOverride);

  // ⚠️ 그리는 순서 — 가장 먼 층(키라인, i=depth+1)이 가장 먼저 그려져야 한다. RN은
  // 나중에 그린 형제가 위에 쌓이므로 i를 depth+1 → 1로 내려가며 렌더하고, 본체(i=0)를
  // 맨 마지막에 별도로 그린다.
  const layers = [];
  for (let i = depth + 1; i >= 1; i--) {
    const color = i === depth + 1 ? keylineColor : extrudeColor;
    layers.push(
      <Text
        key={i}
        style={[
          style,
          {
            position: 'absolute',
            top: i * direction.dy,
            left: i * direction.dx,
            color,
          },
        ]}
        // ⚠️ 본체를 제외한 전 층은 스크린 리더에서 숨긴다 — 안 걸면 텍스트를 여러 번 읽는다.
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {children}
      </Text>,
    );
  }

  return (
    <View>
      {layers}
      <Text style={style}>{children}</Text>
    </View>
  );
}
