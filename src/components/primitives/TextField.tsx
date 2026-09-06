import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../../theme/tokens';
import { Txt } from './Txt';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, className, multiline, numberOfLines, textAlignVertical, ...rest },
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
        multiline={multiline}
        numberOfLines={numberOfLines}
        // ⚠️ 고정 높이(h-12)는 단일 줄 입력 기준이다. multiline에도 그대로 걸리면
        // numberOfLines를 몇으로 주든 48px로 눌려서 긴 문장을 쓸 수 없다 — 리뷰·메모
        // 입력칸에서 실기기로 확인된 문제(docs/DevLog.md 2026-09-05).
        className={[
          'rounded-md bg-input-background px-3 text-[15px] text-foreground',
          multiline ? 'py-3' : 'h-12',
          error ? 'border border-destructive' : '',
          className ?? '',
        ].join(' ')}
        style={multiline ? { minHeight: (numberOfLines ?? 4) * 24 + 24 } : undefined}
        textAlignVertical={textAlignVertical ?? (multiline ? 'top' : undefined)}
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
