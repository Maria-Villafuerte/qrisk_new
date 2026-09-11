import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from '../tokens';
import { text } from '../typography';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/** Estado vacio centrado — historial sin resultados para el filtro activo. */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={text.emptyTitle}>{title}</Text>
      <Text style={[text.captionMd, styles.description]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: palette.textTertiary,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 20,
  },
});
