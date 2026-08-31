import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../../theme/tokens';
import { Txt } from './Txt';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, className, ...rest },
  ref,
) {
  return (
    <View>
      {label && (
        <Txt variant="caption" color="mutedForeground" className="mb-1">
          {label}
        </Txt>
      )}
      <TextInput
        ref={ref}
        className={[
          'h-12 rounded-md bg-input-background px-3 text-[15px] text-foreground',
          error ? 'border border-destructive' : '',
          className ?? '',
        ].join(' ')}
        placeholderTextColor={colors.mutedForeground}
        {...rest}
      />
      {error && (
        <Txt variant="caption" color="destructive" className="mt-1">
          {error}
        </Txt>
      )}
    </View>
  );
});
