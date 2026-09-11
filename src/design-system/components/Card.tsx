import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../tokens';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Quita el padding interno: para tarjetas que gestionan su propio relleno. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Tarjeta blanca con borde suave — la superficie base de casi todo el diseno. */
export function Card({ children, onPress, flush = false, style, accessibilityLabel }: CardProps) {
  const content = [styles.root, flush && styles.flush, style];

  if (!onPress) {
    return <View style={content}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...content, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  flush: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
});
