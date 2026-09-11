import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { palette, radius, shadows, sizing } from '../tokens';
import { text } from '../typography';

export type ButtonVariant =
  /** Azul solido. La accion que la app recomienda. */
  | 'primary'
  /** Blanco con borde. Accion alternativa neutra. */
  | 'secondary'
  /** Sin fondo, solo texto gris. */
  | 'ghost'
  /** Texto en rojo, sin fondo. Para la salida arriesgada de un dialogo. */
  | 'dangerGhost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Icono a la izquierda del texto. */
  icon?: React.ReactNode;
  /**
   * Tinta el borde y el texto de un boton `secondary` con el color del
   * veredicto — asi "Abrir con precaucion" hereda el ambar del riesgo.
   */
  accentColor?: string;
  accentBorderColor?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Compacto (42px), usado en la fila Tomar foto / Galeria. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  accentColor,
  accentBorderColor,
  loading = false,
  disabled = false,
  compact = false,
  style,
}: ButtonProps) {
  const isFilled = variant === 'primary';
  const isInteractive = !disabled && !loading;

  const labelColor =
    accentColor ??
    (variant === 'primary'
      ? '#FFFFFF'
      : variant === 'dangerGhost'
        ? palette.textPrimary
        : variant === 'ghost'
          ? palette.textSecondary
          : palette.textPrimary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      onPress={isInteractive ? onPress : undefined}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        (variant === 'ghost' || variant === 'dangerGhost') && styles.ghost,
        variant === 'secondary' && accentBorderColor
          ? { borderColor: accentBorderColor }
          : null,
        isFilled && shadows.primaryButton,
        pressed && isInteractive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? '#FFFFFF' : palette.brand} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              compact ? text.buttonSm : text.button,
              { color: labelColor },
              variant === 'dangerGhost' && { color: accentColor ?? palette.textPrimary },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizing.buttonHeight,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  compact: {
    height: sizing.buttonHeightSm,
    borderRadius: radius.sm,
  },
  primary: {
    backgroundColor: palette.brand,
  },
  secondary: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    height: 46,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
