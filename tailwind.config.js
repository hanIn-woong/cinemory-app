const { colors: c, radius } = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // 값을 다시 적지 않되, 키는 kebab 구조로 편다 — colors를 통째로 넘기면
      // camelCase 토큰 키(primaryForeground)가 `text-primaryForeground`만 만들고
      // 와이어프레임이 쓰는 `text-primary-foreground`는 만들지 않는다 (§2).
      colors: {
        background: c.background,
        foreground: c.foreground,
        card: c.card,
        border: c.border,
        accent: c.accent,
        destructive: c.destructive,
        star: c.star,
        primary: { DEFAULT: c.primary, foreground: c.primaryForeground },
        muted: { DEFAULT: c.muted, foreground: c.mutedForeground },
        input: { background: c.inputBackground },
        brand: { deep: c.brandDeep, light: c.brandLight },
      },
      borderRadius: radius,
    },
  },
  plugins: [],
};
