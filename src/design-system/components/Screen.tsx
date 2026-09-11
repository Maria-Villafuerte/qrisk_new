import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../tokens';

export interface ScreenProps {
  children: React.ReactNode;
  /**
   * Las pantallas oscuras (escaner) invierten los iconos de la barra de estado
   * y no pintan fondo propio: el degradado va dentro.
   */
  dark?: boolean;
  /** Pinta el fondo claro por defecto. Desactivar cuando el hijo pinta el suyo. */
  backgroundColor?: string;
  /** Aplica el inset inferior del sistema (gestos / home indicator). */
  edgeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Contenedor de pantalla. Resuelve las areas seguras reales del dispositivo:
 * los mockups del diseno dibujan la barra de estado y el home indicator del
 * iPhone, pero eso lo aporta el sistema operativo, no la app.
 */
export function Screen({
  children,
  dark = false,
  backgroundColor,
  edgeBottom = true,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: backgroundColor ?? (dark ? 'transparent' : palette.appBg) },
        { paddingTop: insets.top },
        edgeBottom && { paddingBottom: insets.bottom },
        style,
      ]}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
