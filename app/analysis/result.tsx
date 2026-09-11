import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BottomSheet,
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
  useToast,
  VerdictEmblem,
  VerdictPill,
  verdicts,
} from '../../src/design-system';
import { useAppState } from '../../src/store/AppStateContext';

/**
 * 06 · Resultado del analisis.
 *
 * La jerarquia de los botones depende del veredicto: cuando hay riesgo, la
 * accion recomendada pasa a ser "Ver mas detalles" y abrir el sitio exige una
 * confirmacion explicita. Es friccion deliberada del diseno.
 */
export default function ResultRoute() {
  const router = useRouter();
  const toast = useToast();
  const { result } = useAppState();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const theme = verdicts[result.verdict];
  const isSafe = result.verdict === 'seguro';

  const openSite = () => {
    setConfirmVisible(false);
    toast.show(`Abriendo ${result.domain} en tu navegador…`);
  };

  const riskyOpenLabel =
    result.verdict === 'malicioso' ? 'Abrir bajo mi propio riesgo' : 'Abrir con precaución';

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
        {isSafe ? (
          <>
            <Button label="Abrir URL" onPress={openSite} />
            <Button
              label="Ver más detalles"
              variant="secondary"
              onPress={() => router.push('/analysis/details')}
            />
          </>
        ) : (
          <>
            <Button
              label="Ver más detalles"
              onPress={() => router.push('/analysis/details')}
            />
            <Button
              label={riskyOpenLabel}
              variant="secondary"
              accentColor={theme.color}
              accentBorderColor={theme.ring}
              onPress={() => setConfirmVisible(true)}
            />
          </>
        )}

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

      <BottomSheet visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
        <Text style={[text.sheetTitle, styles.centered]}>¿Abrir este sitio?</Text>
        <Text style={[text.bodySm, styles.centered, styles.sheetBody]}>
          <Text style={styles.sheetDomain}>{result.domain}</Text> mostró señales de riesgo
          durante el análisis. Si continúas, se abrirá en tu navegador.
        </Text>

        {/* Cancelar es la accion primaria: el diseno empuja a no continuar. */}
        <Button label="Cancelar" onPress={() => setConfirmVisible(false)} style={styles.sheetCta} />
        <Button
          label="Abrir de todos modos"
          variant="dangerGhost"
          accentColor={palette.textPrimary}
          onPress={openSite}
        />
      </BottomSheet>
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
  sheetBody: {
    marginBottom: 6,
  },
  sheetDomain: {
    fontFamily: text.cardTitle.fontFamily,
    color: palette.textPrimary,
  },
  sheetCta: {
    marginTop: 6,
  },
});
