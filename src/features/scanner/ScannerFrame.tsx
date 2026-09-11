import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../../design-system';

const FRAME_SIZE = 252;
const CORNER_SIZE = 38;
const CORNER_THICKNESS = 3.5;
const CORNER_RADIUS = 16;
/** Margen interno para que la linea no toque las esquinas. */
const LINE_INSET = 10;

export interface ScannerFrameProps {
  /**
   * Detiene la linea animada. Se usa al detectar un QR, para que la pantalla
   * no siga sugiriendo que esta buscando.
   */
  paused?: boolean;
}

/** Lado del area de escaneo, para que el llamante alinee la camara. */
export const SCANNER_FRAME_SIZE = FRAME_SIZE;

/**
 * Marco de escaneo: cuatro esquinas y una linea que recorre el area de
 * arriba abajo en bucle. Es solo la capa visual; la camara va debajo.
 */
export function ScannerFrame({ paused = false }: ScannerFrameProps) {
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(travel, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [travel, paused]);

  return (
    <View pointerEvents="none" style={styles.frame}>
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      {paused ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lineWrapper,
            {
              transform: [
                {
                  translateY: travel.interpolate({
                    inputRange: [0, 1],
                    outputRange: [FRAME_SIZE * 0.06, FRAME_SIZE * 0.9],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', palette.scanLine, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.line}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: CORNER_RADIUS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: CORNER_RADIUS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: CORNER_RADIUS,
  },
  lineWrapper: {
    position: 'absolute',
    left: LINE_INSET,
    right: LINE_INSET,
    top: 0,
  },
  line: {
    height: 2.5,
    borderRadius: 2,
  },
});
