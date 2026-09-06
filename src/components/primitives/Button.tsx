import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { colors } from '../../theme/tokens';
import { Txt, type TxtColor } from './Txt';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children' | 'disabled'> {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: string;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-muted',
  danger: 'bg-destructive',
};

const VARIANT_TEXT_COLOR: Record<ButtonVariant, TxtColor> = {
  primary: 'primaryForeground',
  secondary: 'foreground',
  danger: 'primaryForeground',
};

const SPINNER_COLOR: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.foreground,
  danger: colors.primaryForeground,
};

export function Button({ variant = 'primary', loading = false, disabled = false, className, children, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={[
        'h-12 items-center justify-center rounded-md px-4',
        VARIANT_CLASS[variant],
        isDisabled ? 'opacity-50' : '',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} />
      ) : (
        <Txt variant="body" color={VARIANT_TEXT_COLOR[variant]} className="font-semibold">
          {children}
        </Txt>
      )}
    </Pressable>
  );
}
