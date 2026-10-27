import React, { useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseIcon } from './icons';

const MAX_SCALE = 4;
/** Escala del doble toque: suficiente para leer un logo o una barra de URL. */
const DOUBLE_TAP_SCALE = 2.5;

interface ZoomableImageViewerProps {
  uri: string;
  visible: boolean;
  onClose: () => void;
  accessibilityLabel?: string;
}

/** Limita el desplazamiento para que la imagen ampliada no se salga del visor. */
function clampOffset(value: number, size: number, scale: number): number {
  'worklet';
  const max = Math.max(0, (size * scale - size) / 2);
  return Math.min(max, Math.max(-max, value));
}

/**
 * Visor a pantalla completa con zoom: pellizcar para ampliar (hasta 4x),
 * arrastrar con un dedo cuando hay zoom y doble toque para alternar 1x/2.5x.
 *
 * Pensado para la captura de la vista previa: lo que delata a un sitio falso
 * (un logo mal hecho, una URL rara en la barra) suele ser pequeno, y pellizcar
 * la imagen es lo primero que intenta cualquiera.
 *
 * Va dentro de un `Modal`, que en Android es otra ventana: por eso lleva su
 * propio `GestureHandlerRootView`.
 */
export function ZoomableImageViewer({
  uri,
  visible,
  onClose,
  accessibilityLabel,
}: ZoomableImageViewerProps) {
  const insets = useSafeAreaInsets();

  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  // Punto del contenido (sin escalar, relativo al centro) bajo el foco del
  // pellizco: se mantiene quieto bajo los dedos mientras se amplia.
  const focusX = useSharedValue(0);
  const focusY = useSharedValue(0);

  // Cada apertura empieza sin zoom.
  useEffect(() => {
    if (!visible) return;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }, [visible, scale, savedScale, translateX, translateY]);

  const onLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
    height.value = event.nativeEvent.layout.height;
  };

  const pinch = usePinchGesture({
    onActivate: (event) => {
      'worklet';
      savedScale.value = scale.value;
      focusX.value = (event.focalX - width.value / 2 - translateX.value) / scale.value;
      focusY.value = (event.focalY - height.value / 2 - translateY.value) / scale.value;
    },
    onUpdate: (event) => {
      'worklet';
      // Se permite bajar un poco de 1x mientras se pellizca: al soltar rebota.
      const next = Math.min(MAX_SCALE, Math.max(0.8, savedScale.value * event.scale));
      scale.value = next;
      translateX.value = event.focalX - width.value / 2 - focusX.value * next;
      translateY.value = event.focalY - height.value / 2 - focusY.value * next;
    },
    onDeactivate: () => {
      'worklet';
      if (scale.value <= 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        return;
      }
      translateX.value = withTiming(clampOffset(translateX.value, width.value, scale.value));
      translateY.value = withTiming(clampOffset(translateY.value, height.value, scale.value));
    },
  });

  const pan = usePanGesture({
    maxPointers: 1,
    onActivate: () => {
      'worklet';
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    },
    onUpdate: (event) => {
      'worklet';
      // Sin zoom no hay nada que arrastrar.
      if (scale.value <= 1) return;
      translateX.value = clampOffset(savedX.value + event.translationX, width.value, scale.value);
      translateY.value = clampOffset(savedY.value + event.translationY, height.value, scale.value);
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (event) => {
      'worklet';
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        return;
      }
      // Amplia centrando el punto tocado.
      const offset = 1 - DOUBLE_TAP_SCALE;
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      translateX.value = withTiming(
        clampOffset((event.x - width.value / 2) * offset, width.value, DOUBLE_TAP_SCALE),
      );
      translateY.value = withTiming(
        clampOffset((event.y - height.value / 2) * offset, height.value, DOUBLE_TAP_SCALE),
      );
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={gesture}>
          <View style={styles.stage} onLayout={onLayout}>
            <Animated.View style={[styles.fill, imageStyle]}>
              <Image
                source={{ uri }}
                style={styles.fill}
                resizeMode="contain"
                accessibilityLabel={accessibilityLabel}
              />
            </Animated.View>
          </View>
        </GestureDetector>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar vista previa"
          hitSlop={12}
          style={[styles.close, { top: insets.top + 12 }]}
        >
          <CloseIcon size={22} color="#FFFFFF" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  close: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
});
