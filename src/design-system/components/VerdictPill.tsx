import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { radius, verdicts, VerdictKey } from '../tokens';
import { text } from '../typography';
import { VerdictShield } from './icons';

export interface VerdictPillProps {
  verdict: VerdictKey;
  /** `large` para la pantalla de resultado, `small` para filas de historial. */
  size?: 'small' | 'large';
  /** Usa la etiqueta corta ("Seguro") en vez de la larga ("SEGURO"). */
  short?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Pildora con escudo + etiqueta, coloreada segun el veredicto. */
export function VerdictPill({
  verdict,
  size = 'large',
  short = false,
  style,
}: VerdictPillProps) {
  const theme = verdicts[verdict];
  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.root,
        isLarge ? styles.large : styles.small,
        { backgroundColor: theme.tint },
        style,
      ]}
    >
      <VerdictShield
        verdict={verdict}
        size={isLarge ? 14 : 12}
        color={theme.color}
        strokeWidth={3}
      />
      <Text style={[isLarge ? text.pill : text.pillSm, { color: theme.color }]}>
        {short ? theme.shortLabel : theme.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    gap: 5,
  },
  large: {
    paddingVertical: 6,
    paddingHorizontal: 15,
  },
  small: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
});
