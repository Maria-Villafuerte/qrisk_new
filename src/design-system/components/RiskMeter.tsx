import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, verdicts, VerdictKey } from '../tokens';
import { text } from '../typography';
import { Card } from './Card';

export interface RiskMeterProps {
  /** Puntaje 0–100. Se recorta al rango para que la barra nunca desborde. */
  score: number;
  verdict: VerdictKey;
}

/** Barra de nivel de riesgo con extremos etiquetados. */
export function RiskMeter({ score, verdict }: RiskMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = verdicts[verdict].color;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={text.cardTitleSm}>Nivel de riesgo</Text>
        <Text style={[styles.score, { color }]}>
          {clamped}
          <Text style={styles.scoreMax}>/100</Text>
        </Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
      >
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.headerRow}>
        <Text style={text.micro}>0 · seguro</Text>
        <Text style={text.micro}>100 · peligroso</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  score: {
    fontFamily: text.cardTitle.fontFamily,
    fontSize: 16,
    lineHeight: 21,
  },
  scoreMax: {
    fontFamily: text.captionMd.fontFamily,
    fontSize: 12,
    color: palette.textTertiary,
  },
  track: {
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.trackBg,
    overflow: 'hidden',
    marginVertical: 9,
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
  },
});
