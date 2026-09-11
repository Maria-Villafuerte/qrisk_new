import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../tokens';
import { text } from '../typography';

export interface InfoBannerProps {
  icon: React.ReactNode;
  children: string;
  /** `brand` para el aviso azul; `muted` para la nota gris de privacidad. */
  variant?: 'muted' | 'brand';
  style?: StyleProp<ViewStyle>;
}

/** Aviso corto con icono — privacidad de la camara, anonimato del reporte. */
export function InfoBanner({ icon, children, variant = 'muted', style }: InfoBannerProps) {
  const isBrand = variant === 'brand';

  return (
    <View
      style={[
        styles.root,
        isBrand ? styles.brand : styles.muted,
        style,
      ]}
    >
      <View style={styles.icon}>{icon}</View>
      <Text
        style={[
          text.captionMd,
          styles.label,
          isBrand && { color: palette.brandDark, lineHeight: 19 },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  muted: {
    backgroundColor: palette.surfaceMutedAlt,
    alignItems: 'center',
  },
  brand: {
    backgroundColor: palette.brandTint,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 10,
  },
  icon: {
    marginTop: 1,
  },
  label: {
    flex: 1,
  },
});
