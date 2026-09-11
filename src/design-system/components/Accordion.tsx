import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { palette, radius, spacing, tones, Tone } from '../tokens';
import { text } from '../typography';
import { Card } from './Card';
import { ChevronDownIcon } from './icons';

// LayoutAnimation necesita habilitarse explicitamente en Android con la
// arquitectura antigua; es inocuo bajo la nueva.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AccordionProps {
  title: string;
  icon: React.ReactNode;
  /** Etiqueta de estado: "SIN ALERTAS" / "3 ALERTAS". */
  badgeText: string;
  badgeTone: Tone;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Seccion colapsable del detalle del analisis (progressive disclosure).
 * Solo la chevron se anima; la altura la resuelve LayoutAnimation.
 */
export function Accordion({
  title,
  icon,
  badgeText,
  badgeTone,
  defaultOpen = false,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open, rotation]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const badge = tones[badgeTone];

  return (
    <Card flush>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${badgeText}`}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        {icon}
        <Text style={[text.cardTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.badge, { backgroundColor: badge.tint }]}>
          <Text style={[text.badge, { color: badge.color }]}>{badgeText}</Text>
        </View>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }}
        >
          <ChevronDownIcon />
        </Animated.View>
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  title: {
    flex: 1,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    paddingTop: spacing.md,
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
});
