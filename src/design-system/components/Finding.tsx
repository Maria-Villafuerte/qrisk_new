import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tones, Tone } from '../tokens';
import { text } from '../typography';
import { CheckCircleIcon, WarningCircleIcon } from './icons';

export interface FindingProps {
  tone: Tone;
  children: string;
}

/** Linea de hallazgo dentro de un acordeon: icono de estado + explicacion. */
export function Finding({ tone, children }: FindingProps) {
  const theme = tones[tone];
  const Icon = tone === 'ok' ? CheckCircleIcon : WarningCircleIcon;

  return (
    <View style={styles.row}>
      <Icon size={17} color={theme.color} background={theme.tint} />
      <Text style={[text.finding, styles.label]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  label: {
    flex: 1,
  },
});
