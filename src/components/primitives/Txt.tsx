import { Text, type TextProps } from 'react-native';

export type TxtVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption';
export type TxtColor = 'foreground' | 'mutedForeground' | 'primary' | 'primaryForeground' | 'destructive' | 'star';

interface TxtProps extends TextProps {
  variant?: TxtVariant;
  color?: TxtColor;
  className?: string;
}

const VARIANT_CLASS: Record<TxtVariant, string> = {
  h1: 'text-[32px] leading-[40px] font-bold',
  h2: 'text-[24px] leading-[32px] font-bold',
  h3: 'text-[20px] leading-[28px] font-semibold',
  h4: 'text-[17px] leading-[24px] font-semibold',
  body: 'text-[15px] leading-[22px] font-normal',
  caption: 'text-[13px] leading-[18px] font-normal',
};

const COLOR_CLASS: Record<TxtColor, string> = {
  foreground: 'text-foreground',
  mutedForeground: 'text-muted-foreground',
  primary: 'text-primary',
  primaryForeground: 'text-primary-foreground',
  destructive: 'text-destructive',
  star: 'text-star',
};

const DEFAULT_COLOR: Record<TxtVariant, TxtColor> = {
  h1: 'foreground',
  h2: 'foreground',
  h3: 'foreground',
  h4: 'foreground',
  body: 'foreground',
  caption: 'mutedForeground',
};

export function Txt({ variant = 'body', color, className, ...rest }: TxtProps) {
  const resolvedColor = color ?? DEFAULT_COLOR[variant];
  return (
    <Text
      className={[VARIANT_CLASS[variant], COLOR_CLASS[resolvedColor], className ?? ''].join(' ')}
      {...rest}
    />
  );
}
