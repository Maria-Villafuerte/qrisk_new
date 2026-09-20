import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius, sizing, spacing } from '../tokens';
import { text } from '../typography';
import { ChevronLeftIcon } from './icons';

export interface ScreenHeaderProps {
  title: string;
  /** Omitir para pantallas sin retroceso. */
  onBack?: () => void;
  /** Texto discreto alineado a la derecha (ej. "Ultimos 20 · sin internet"). */
  trailingText?: string;
  /** Sustituye el boton de retroceso (ej. el spinner del analisis). */
  leading?: React.ReactNode;
}

export function ScreenHeader({
  title,
  onBack,
  trailingText,
  leading,
}: ScreenHeaderProps) {
  return (
    <View style={styles.root}>
      {leading ??
        (onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ChevronLeftIcon />
          </Pressable>
        ) : null)}

      <Text style={[text.header, styles.title]} numberOfLines={1}>
        {title}
      </Text>

      {trailingText ? (
        <Text style={text.captionSm} numberOfLines={1}>
          {trailingText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: sizing.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: sizing.backButton,
    height: sizing.backButton,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
  },
});
