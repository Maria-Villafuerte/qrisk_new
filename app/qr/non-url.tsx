import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Button,
  Card,
  CopyIcon,
  IconEmblem,
  palette,
  radius,
  Screen,
  ScreenHeader,
  spacing,
  text,
  useToast,
  WifiIcon,
} from '../../src/design-system';
import { useAppState } from '../../src/store/AppStateContext';

/**
 * 04 · QR que no contiene un enlace. No pasa por el analisis de seguridad
 * porque no hay nada que visitar. El contenido lo deja el escaner al
 * clasificar la lectura.
 */
export default function NonUrlRoute() {
  const router = useRouter();
  const toast = useToast();
  const { nonUrlContent } = useAppState();

  const copy = async () => {
    // Se copia el texto tal como venia en el QR: en una red Wi-Fi eso incluye
    // la contrasena, que en pantalla se muestra enmascarada.
    try {
      await Clipboard.setStringAsync(nonUrlContent.raw);
      toast.show('Contenido copiado al portapapeles');
    } catch {
      // Confirmar una copia que no ocurrio es peor que avisar del fallo: la
      // persona pegaria algo viejo sin darse cuenta.
      toast.show('No se pudo copiar el contenido');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Contenido del QR" onBack={() => router.replace('/scanner')} />

      <View style={styles.body}>
        <IconEmblem size={104} outerColor={palette.brandTint}>
          {nonUrlContent.kind === 'wifi' ? (
            <WifiIcon size={44} />
          ) : (
            <CopyIcon size={40} color={palette.brand} />
          )}
        </IconEmblem>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{nonUrlContent.label}</Text>
        </View>

        <Text style={[text.displaySm, styles.centered]}>{nonUrlContent.title}</Text>
        <Text style={[text.bodySm, styles.centered]}>{nonUrlContent.description}</Text>

        {/*
          La etiqueta va arriba, chica, y el contenido debajo, grande: en la
          prueba de usabilidad, en la misma linea se leian como una sola cosa.
          "Copiar" va dentro de la tarjeta, junto a lo que copia.
        */}
        <Card style={styles.details}>
          {nonUrlContent.rows.map((row) => (
            <View key={row.label} style={[styles.detailRow, styles.detailDivider]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={[styles.rowValue, row.mono && styles.monoValue]} selectable>
                {row.value}
              </Text>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copiar contenido"
            onPress={copy}
            hitSlop={8}
            style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
          >
            <CopyIcon size={18} color={palette.brand} />
            <Text style={styles.copyLabel}>Copiar</Text>
          </Pressable>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button label="Escanear otro QR" onPress={() => router.replace('/scanner')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: 24,
    paddingTop: spacing.xxl,
  },
  badge: {
    backgroundColor: palette.brandTint,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 13,
  },
  badgeText: {
    fontFamily: text.pillSm.fontFamily,
    fontSize: 12,
    letterSpacing: 0.48,
    color: palette.brand,
  },
  centered: {
    textAlign: 'center',
  },
  details: {
    width: '100%',
    paddingVertical: 4,
  },
  detailRow: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontFamily: text.fieldLabel.fontFamily,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.textTertiary,
  },
  rowValue: {
    fontFamily: text.rowValue.fontFamily,
    fontSize: 17,
    lineHeight: 23,
    color: palette.textPrimary,
  },
  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  monoValue: {
    fontFamily: text.mono.fontFamily,
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    marginVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.brandTint,
  },
  copyLabel: {
    fontFamily: text.buttonSm.fontFamily,
    fontSize: 15,
    color: palette.brand,
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 24,
  },
});
