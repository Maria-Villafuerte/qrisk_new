import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
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
  useToast,
  WarningCircleIcon,
  VerdictEmblem,
  VerdictPill,
  verdicts,
} from '../../src/design-system';
import { isFilterEnabled } from '../../src/services/analysis/enabledFilters';
import { runExternal } from '../../src/services/navigation/resumePolicy';
import { useAppState } from '../../src/store/AppStateContext';

/**
 * 06 · Resultado del analisis.
 *
 * SOBRE EL BOTON DE ABRIR. La regla del producto es que la app nunca abre una
 * URL por su cuenta: el analisis ocurre en el entorno aislado del backend y el
 * telefono jamas visita el sitio para analizarlo. Abrir es otra cosa: una
 * accion explicita de la persona, ya informada del veredicto.
 *
 * La friccion escala con el riesgo, que es donde vive el valor del producto:
 *   - seguro      -> abre directo, sin estorbar.
 *   - lo demas    -> hoja de confirmacion que repite el dominio y las alertas
 *                    encontradas, con "Cancelar" como accion primaria.
 *
 * La app informa y encarece la decision riesgosa; no la prohibe. Decidir queda
 * del lado de la persona, que es la unica que sabe si confia en quien puso el
 * codigo.
 */
export default function ResultRoute() {
  const router = useRouter();
  const toast = useToast();
  const { result } = useAppState();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const theme = verdicts[result.verdict];
  const isSafe = result.verdict === 'seguro';

  /**
   * Cuenta las alertas reales que trajo el analisis, para el copy de la hoja.
   *
   * Se cuentan SOLO las secciones de los filtros activos, que son las mismas
   * que pinta la pantalla de detalle (`details.tsx` filtra con el mismo
   * `isFilterEnabled`). El numero de la hoja tiene que ser comprobable: si la
   * hoja dijera "3 señales" y el detalle mostrara 1, la persona que va a
   * decidir si abre un enlace peligroso pierde la confianza en el dato justo
   * cuando mas lo necesita. Hoy no diverge porque el backend no manda
   * `sections[]`, pero el adaptador conserva a proposito las secciones de
   * filtros apagados, asi que divergiria en cuanto el contrato se alinee.
   */
  const alertCount = result.sections
    .filter((section) => isFilterEnabled(section.key))
    .reduce(
      (total, section) => total + section.findings.filter((f) => f.tone === 'warn').length,
      0,
    );

  /**
   * Atras: vuelve a la pantalla de la que se vino.
   *
   * A esta pantalla se llega por dos caminos y antes los dos terminaban en el
   * escaner, porque el boton hacia `replace('/scanner')` sin mirar:
   *
   *   escaner -> loading -> (replace) result    el escaner queda debajo
   *   historial -> (push) result                el historial queda debajo
   *
   * En el segundo, `replace('/scanner')` DESTRUIA el historial: la persona
   * abria una fila, tocaba atras y aparecia en la camara, sin forma de volver
   * a la lista que estaba mirando. `back()` respeta los dos casos, porque en
   * el primero lo que hay debajo es justamente el escaner.
   *
   * El `replace` se conserva como salida de emergencia: si no hay nada debajo
   * (un enlace profundo directo a esta ruta), el boton tiene que llevar a
   * alguna parte.
   */
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/scanner');
  };

  /**
   * Abre el sitio en el navegador del sistema, NUNCA dentro de la app: fuera
   * de QRisk la pagina no puede hacerse pasar por una pantalla nuestra.
   */
  const openSite = async () => {
    setConfirmVisible(false);
    try {
      // runExternal: al volver del navegador se queda en el resultado en vez
      // de saltar al escaner (ver resumePolicy.ts).
      await runExternal(() => Linking.openURL(result.url));
    } catch {
      // Un esquema que el telefono no sabe abrir, o sin navegador instalado.
      // Se avisa en vez de dejar el toque sin respuesta.
      toast.show('No se pudo abrir el enlace en tu navegador.');
    }
  };

  const riskyOpenLabel =
    result.verdict === 'malicioso' ? 'Abrir bajo mi propio riesgo' : 'Abrir con precaución';

  return (
    <Screen>
      <ScreenHeader title="Resultado del análisis" onBack={goBack} />

      <View style={styles.body}>
        <VerdictEmblem verdict={result.verdict} />
        {/*
          La pildora trae `alignSelf: 'flex-start'` para no estirarse en las
          filas del historial. Aqui se centra a mano: el emblema, el dominio y
          la URL estan centrados, y sin esto la etiqueta del veredicto quedaba
          pegada al borde izquierdo.
        */}
        <VerdictPill verdict={result.verdict} style={styles.centeredPill} />

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
        {/*
          La jerarquia se invierte con el riesgo: en un sitio seguro la accion
          recomendada es abrir; en uno con señales, es mirar los detalles. El
          boton de abrir no desaparece —decidir es de la persona— pero deja de
          ser el camino facil.
        */}
        {isSafe ? (
          <>
            <Button label="Abrir sitio" onPress={openSite} />
            <Button
              label="Ver más detalles"
              variant="secondary"
              onPress={() => router.push('/analysis/details')}
            />
          </>
        ) : (
          <>
            <Button label="Ver más detalles" onPress={() => router.push('/analysis/details')} />
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
            label="Crear afiche de advertencia"
            onPress={() => router.push('/story-card')}
          />
        </View>
      </View>

      {/*
        Confirmacion para los veredictos con riesgo. Repite el dominio y cuantas
        alertas se encontraron: la persona decide viendo el dato concreto, no
        una advertencia generica que ya se acostumbro a ignorar.
      */}
      <BottomSheet visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
        <Text style={[text.sheetTitle, styles.centered]}>¿Abrir este sitio?</Text>
        <Text style={[text.bodySm, styles.centered, styles.sheetBody]}>
          <Text style={styles.sheetDomain}>{result.domain}</Text>
          {alertCount > 0
            ? ` tiene ${alertCount} ${alertCount === 1 ? 'señal' : 'señales'} de riesgo. `
            : ' mostró señales de riesgo durante el análisis. '}
          Si continúas, se abrirá en tu navegador, fuera de QRisk.
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
  centeredPill: {
    alignSelf: 'center',
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
