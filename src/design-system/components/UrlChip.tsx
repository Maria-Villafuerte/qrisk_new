import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../tokens';
import { text } from '../typography';
import { LockIcon } from './icons';

export interface UrlChipProps {
  url: string;
  /** Color del candado y del texto; por defecto gris de cuerpo. */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * URL completa en monoespaciada sobre fondo gris. Nunca es interactiva:
 * mostrar el enlace no debe poder abrirlo.
 */
export function UrlChip({ url, muted = false, style }: UrlChipProps) {
  const color = muted ? palette.textSecondary : palette.textBody;

  return (
    <View style={[styles.root, style]}>
      <LockIcon size={15} color={muted ? palette.textTertiary : palette.textSecondary} />
      <Text style={[text.mono, { color }, styles.url]} selectable>
        {url}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  url: {
    flex: 1,
  },
});
