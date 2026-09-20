import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  FlagIcon,
  InfoBanner,
  palette,
  Screen,
  ScreenHeader,
  spacing,
  StoryCardIcon,
  text,
  WarningCircleIcon,
  VerdictEmblem,
  VerdictPill,
} from '../../src/design-system';
import { useAppState } from '../../src/store/AppStateContext';

/**
 * 06 · Resultado del analisis.
 *
 * NO HAY BOTON PARA ABRIR EL SITIO, y es la decision de producto central de
 * esta pantalla, no una funcionalidad que falte.
 *
 * Antes habia uno que mostraba un toast "Abriendo <dominio> en tu navegador…"
 * y no abria nada: prometia y mentia, justo sobre la regla fundamental del
 * README —"la app NUNCA abre la URL analizada"—. Implementarlo de verdad
 * contradecia esa regla de frente; dejar el toast era peor, porque ademas
 * enganaba. Asi que se quita y se explica por que.
 *
 * Si algun dia se decide lo contrario, el sitio donde va es este, y hay que
 * cambiar antes la regla fundamental del README: no al reves.
 */
export default function ResultRoute() {
  const router = useRouter();
  const { result } = useAppState();

  const isSafe = result.verdict === 'seguro';

  return (
    <Screen>
      <ScreenHeader title="Resultado del análisis" onBack={() => router.replace('/scanner')} />

      <View style={styles.body}>
        <VerdictEmblem verdict={result.verdict} />
        <VerdictPill verdict={result.verdict} />

        <View style={styles.identity}>
          <Text style={[text.domain, styles.centered]}>{result.domain}</Text>
          <Text style={[text.monoSm, styles.centered]}>{result.url}</Text>
        </View>

        <Text style={[text.body, styles.summary]}>{result.summary}</Text>

        {/* El analisis no llego hasta el final: se dice, no se disimula. */}
        {result.degraded ? (
          <InfoBanner icon={<WarningCircleIcon size={16} />} style={styles.degraded}>
            No pudimos completar todas las verificaciones. Este veredicto se calculó con
            información incompleta.
          </InfoBanner>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button label="Ver más detalles" onPress={() => router.push('/analysis/details')} />

        {/*
          Por que no hay boton de abrir. El copy cambia con el veredicto: en un
          sitio seguro explica la regla, y en uno riesgoso ademas dice que hacer.
        */}
        <Text style={[text.caption, styles.noOpenNote]}>
          {isSafe
            ? 'QRisk no abre enlaces. Si quieres visitarlo, escribe la dirección tú mismo en tu navegador.'
            : 'QRisk no abre enlaces, y este no deberías abrirlo. Si aun así necesitas hacerlo, escribe la dirección tú mismo en tu navegador.'}
        </Text>

        <View style={styles.secondaryActions}>
          <SecondaryAction
            icon={<FlagIcon />}
            label="Reportar QR"
            onPress={() => router.push('/report')}
          />
          <SecondaryAction
            icon={<StoryCardIcon />}
            label="Crear Story Card"
            onPress={() => router.push('/story-card')}
          />
        </View>
      </View>

    </Screen>
  );
}

function SecondaryAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    paddingHorizontal: spacing.xxl,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  degraded: {
    marginTop: spacing.sm,
  },
  summary: {
    textAlign: 'center',
    color: palette.textBody,
    maxWidth: 295,
  },
  footer: {
    gap: 9,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 24,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 26,
    paddingTop: 6,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryLabel: {
    fontFamily: text.buttonSm.fontFamily,
    fontSize: 13.5,
    color: palette.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  noOpenNote: {
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
});
