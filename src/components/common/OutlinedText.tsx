import { Text, View, type TextStyle } from 'react-native';

interface OutlinedTextProps {
  children: string;
  style: TextStyle;
  // 단일 색이면 4방향 전부 같은 색, 배열이면 [좌상, 우상, 좌하, 우하] 순서로 각기 다른 색을 준다.
  outlineColor: string | [string, string, string, string];
  outlineOffset?: number;
}

const CORNERS: { dx: number; dy: number }[] = [
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: 1 },
];

// RN `Text`의 `textShadow*`는 오프셋이 하나뿐이라 와이어프레임의 4방향 아웃라인을 낼 수
// 없다 — 배경 4겹(오프셋 ±offset) + 본체 1겹으로 겹쳐서 흉내낸다(docs/M2-frontend-spec.md
// §9.1). 스플래시·로그인에서도 재사용할 수 있도록 홈 전용 색상을 하드코딩하지 않는다.
//
// ⚠️ **겹치는 부분은 `outlineColor`의 앞쪽(인덱스가 작은 쪽, 기본은 좌상단)이 위로 올라온다**
// — CSS `text-shadow`가 목록의 첫 그림자를 가장 위에 그리는 것과 같은 규칙이다. RN은
// 나중에 그린 형제가 위에 쌓이므로, 배경 레이어를 CORNERS 역순으로 그려서 인덱스 0이
// 가장 나중(가장 위)에 오도록 뒤집는다.
export function OutlinedText({ children, style, outlineColor, outlineOffset = 2 }: OutlinedTextProps) {
  const colors = Array.isArray(outlineColor) ? outlineColor : CORNERS.map(() => outlineColor);
  const drawOrder = CORNERS.map((_, i) => i).reverse();

  return (
    <View>
      {drawOrder.map((i) => {
        const { dx, dy } = CORNERS[i];
        return (
          <Text
            key={i}
            style={[
              style,
              {
                position: 'absolute',
                top: dy * outlineOffset,
                left: dx * outlineOffset,
                color: colors[i],
              },
            ]}
            // ⚠️ 배경 4겹은 스크린 리더에서 숨긴다 — 안 걸면 텍스트를 다섯 번 읽는다(§9.1).
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {children}
          </Text>
        );
      })}
      <Text style={style}>{children}</Text>
    </View>
  );
}
