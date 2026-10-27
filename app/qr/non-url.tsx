import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  /** Si la contrasena de la red se ve en claro. Siempre arranca oculta. */
  const [revealed, setRevealed] = useState(false);

  // La contrasena de una red Wi-Fi, si el QR trae una.
  const secret = nonUrlContent.rows.find((row) => row.secret)?.secret;

  const copy = async (value: string, done: string) => {
    try {
      await Clipboard.setStringAsync(value);
      toast.show(done);
    } catch {
      // Confirmar una copia que no ocurrio es peor que avisar del fallo: la
      // persona pegaria algo viejo sin darse cuenta.
      toast.show('No se pudo copiar el contenido');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Contenido del QR" onBack={() => router.replace('/scanner')} />

      {/* Con scroll: una red Wi-Fi trae tres filas y no caben en un telefono bajo. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
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

        <Text style={[text.displaySm, styles.centered]} accessibilityRole="header">
          {nonUrlContent.title}
        </Text>
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
              {row.secret ? (
                <View style={styles.secretRow}>
                  <Text
                    style={[styles.rowValue, styles.secretValue, row.mono && styles.monoValue]}
                    selectable={revealed}
                  >
                    {revealed ? row.secret : row.value}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onPress={() => setRevealed((shown) => !shown)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.revealLabel}>{revealed ? 'Ocultar' : 'Mostrar'}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.rowValue, row.mono && styles.monoValue]} selectable>
                  {row.value}
                </Text>
              )}
            </View>
          ))}

          {/*
            Con contrasena, copiarla sola es lo que la persona quiere casi
            siempre: es lo que se pega en el campo de la red. El contenido
            completo (la cadena WIFI:...) queda como segunda opcion.
          */}
          {secret ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar contraseña"
              onPress={() => void copy(secret, 'Contraseña copiada al portapapeles')}
              hitSlop={8}
              style={({ pressed }) => [styles.copyButton, styles.copyButtonFirst, pressed && styles.pressed]}
            >
              <CopyIcon size={18} color={palette.brand} />
              <Text style={styles.copyLabel}>Copiar contraseña</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secret ? 'Copiar contenido completo' : 'Copiar contenido'}
            onPress={() => void copy(nonUrlContent.raw, 'Contenido copiado al portapapeles')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.copyButton,
              secret ? styles.copyButtonSecondary : null,
              pressed && styles.pressed,
            ]}
          >
            <CopyIcon size={18} color={palette.brand} />
            <Text style={styles.copyLabel}>{secret ? 'Copiar contenido completo' : 'Copiar'}</Text>
          </Pressable>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Escanear otro QR" onPress={() => router.replace('/scanner')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: 24,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
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
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secretValue: {
    flex: 1,
  },
  revealButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  revealLabel: {
    fontFamily: text.buttonSm.fontFamily,
    fontSize: 15,
    color: palette.brand,
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
  // Dos botones seguidos: el margen entre ellos se reparte para no duplicarlo.
  copyButtonFirst: {
    marginBottom: 0,
  },
  /** La copia completa pasa a segundo plano cuando hay contrasena. */
  copyButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.brandBorder,
    marginTop: spacing.sm,
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
