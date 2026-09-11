import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BrandMark,
  Button,
  IconEmblem,
  InfoBanner,
  palette,
  radius,
  Screen,
  spacing,
  text,
} from '../../design-system';

export interface PermissionScreenProps {
  /** Icono grande dentro del circulo azul. */
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Aviso al pie del bloque central. */
  note?: { icon: React.ReactNode; text: string };
  /** Insignia sobre el titulo, p. ej. "OPCIONAL". */
  badge?: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  /** Paso actual del onboarding, base 1. */
  step: 1 | 2;
}

const TOTAL_STEPS = 2;

/**
 * Estructura comun de las dos pantallas de permisos: marca arriba, emblema
 * centrado, y el par de botones abajo.
 */
export function PermissionScreen({
  icon,
  title,
  description,
  note,
  badge,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  step,
}: PermissionScreenProps) {
  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <BrandMark size={22} />
          <Text style={styles.brandName}>QRisk</Text>
        </View>

        <View style={styles.dots} accessibilityLabel={`Paso ${step} de ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === step - 1 ? styles.dotActive : styles.dotIdle]}
            />
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <IconEmblem
          size={136}
          innerSize={96}
          outerColor={palette.brandTint}
          innerColor={palette.brandBorder}
        >
          {icon}
        </IconEmblem>

        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        <Text style={[text.display, styles.centered]}>{title}</Text>
        <Text style={[text.body, styles.centered]}>{description}</Text>

        {note ? <InfoBanner icon={note.icon}>{note.text}</InfoBanner> : null}
      </View>

      <View style={styles.footer}>
        <Button label={primaryLabel} onPress={onPrimary} />
        <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandName: {
    fontFamily: text.display.fontFamily,
    fontSize: 15,
    letterSpacing: -0.15,
    color: palette.textPrimary,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: palette.brand,
  },
  dotIdle: {
    width: 6,
    backgroundColor: '#DDD9D0',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 32,
  },
  badge: {
    backgroundColor: palette.brandTint,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 13,
  },
  badgeText: {
    fontFamily: text.pillSm.fontFamily,
    fontSize: 11,
    letterSpacing: 0.6,
    color: palette.brand,
  },
  centered: {
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 24,
  },
});
