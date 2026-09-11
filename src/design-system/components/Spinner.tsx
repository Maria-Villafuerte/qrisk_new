import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { palette } from '../tokens';

export interface SpinnerProps {
  size?: number;
  color?: string;
  trackColor?: string;
  /** Grosor del anillo. */
  thickness?: number;
}

/**
 * Anillo giratorio con un solo lado coloreado — replica el spinner del diseno
 * (`border-top-color` distinto al resto del borde).
 */
export function Spinner({
  size = 22,
  color = palette.brand,
  trackColor = palette.brandBorder,
  thickness = 2.5,
}: SpinnerProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: trackColor,
          borderTopColor: color,
          transform: [
            {
              rotate: spin.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: 'transparent',
  },
});
