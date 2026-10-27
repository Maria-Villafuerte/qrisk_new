import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, shadows } from '../tokens';
import { fontFamily } from '../typography';

interface ToastContextValue {
  /** Muestra un mensaje efimero centrado en la parte inferior. */
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2600;
/** Tope de permanencia: un aviso no debe quedarse tapando la pantalla. */
const MAX_VISIBLE_MS = 6000;

/**
 * Cuanto se muestra un mensaje. Con un tiempo fijo, los avisos largos ("Reporte
 * enviado de forma anonima. ¡Gracias por...!") desaparecian antes de leerse.
 */
function visibleMsFor(message: string): number {
  return Math.min(MAX_VISIBLE_MS, Math.max(VISIBLE_MS, message.length * 60));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      // `accessibilityLiveRegion` solo existe en Android; en iOS se anuncia a mano.
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(next);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setMessage(null);
        });
      }, visibleMsFor(next));
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.wrapper, { opacity, bottom: insets.bottom + 30 }]}
        >
          <View style={styles.toast}>
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Devuelve `show(mensaje)`. Debe usarse dentro de `ToastProvider`. */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return value;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  toast: {
    backgroundColor: palette.textPrimary,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    maxWidth: '85%',
    ...shadows.toast,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 19,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
