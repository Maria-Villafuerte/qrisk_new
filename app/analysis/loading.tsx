import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import {
  Button,
  Card,
  CheckCircleIcon,
  palette,
  radius,
  Screen,
  ScreenHeader,
  Skeleton,
  spacing,
  Spinner,
  text,
  UrlChip,
} from '../../src/design-system';
import { analysisStages } from '../../src/services/analysis/analysisStages';
import {
  analysisErrorMessage,
  remoteAnalysisService,
} from '../../src/services/analysis/remoteAnalysisService';
import { ApiError } from '../../src/services/api/errors';
import { getCurrentPlaceName } from '../../src/services/location';
import { classifyQr } from '../../src/services/qr';
import { useAppState } from '../../src/store/AppStateContext';

type StageStatus = 'done' | 'running' | 'pending';

/**
 * Cuanto se espera antes de avisar que el analisis esta tardando.
 *
 * Son 40 s. Con la cascada completa (medida el 2026-10-11: 24-35 s en el
 * camino normal) cualquier umbral por debajo de 35 s hacia salir el aviso en
 * casi todos los analisis, y un aviso que aparece siempre deja de informar y
 * ademas miente ("mas de lo normal"). La duracion normal ya se anuncia desde
 * el principio en el texto de la pantalla; esto queda para el caso que de
 * verdad pasa del peor tiempo medido.
 */
const LONG_WAIT_NOTICE_MS = 40_000;

/**
 * 05 · Analisis en curso. Recorre la cascada de filtros mientras el servicio
 * resuelve, y sustituye la pantalla al terminar (`replace`) para que el boton
 * de retroceso no vuelva a la espera.
 */
export default function LoadingRoute() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const { result, setResult, addScan, locationEnabled, setNonUrlContent } = useAppState();

  // Sin parametro se usa el resultado ya activo: asi la pantalla nunca queda
  // sin URL que mostrar. Puede quedar vacio si se llega aqui sin haber
  // escaneado nada (un enlace directo, por ejemplo); ver el efecto de abajo.
  const analyzedUrl = url ?? result.url;

  const [stageIndex, setStageIndex] = useState(0);
  const [takingLong, setTakingLong] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /**
   * Intento en curso. "Reintentar" en el aviso de error lo incrementa, y los
   * tres efectos de abajo dependen de el: la cascada vuelve a empezar con la
   * misma URL, sin tener que volver a apuntar la camara al codigo.
   */
  const [attempt, setAttempt] = useState(0);

  /**
   * Aviso de espera larga.
   *
   * Un sitio que el backend no vio antes tarda ~15 s, porque F2.3 le toma una
   * captura con un navegador headless. Sin decir nada, quince segundos de
   * spinner se leen como "la app se colgo" y la persona cierra o reintenta.
   * Si pasa de LONG_WAIT_NOTICE_MS se explica que sigue trabajando y por que
   * tarda.
   */
  useEffect(() => {
    setTakingLong(false);
    const timer = setTimeout(() => setTakingLong(true), LONG_WAIT_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  /**
   * Avance visual de la cascada.
   *
   * Las etapas avanzan por tiempo, pero la ultima NO se marca sola: se queda en
   * curso hasta que el analisis responde de verdad. Con las tres etapas de la
   * cascada activas (ver `enabledFilters.ts`), `slice` programa el avance de F1
   * y F2.1 por reloj, y F2.2 —la mas larga, 16 s de los ~30 totales— gira hasta
   * que llega el veredicto.
   *
   * El invariante es el que importa: el reloj nunca declara terminado el
   * analisis. Si el backend tarda mas de lo previsto, la ultima fila sigue
   * girando; si responde antes, `setStageIndex(analysisStages.length)` cierra
   * las tres de golpe. Lo que no puede pasar es que la pantalla diga "listo"
   * mientras la peticion sigue en vuelo.
   */
  useEffect(() => {
    setStageIndex(0);
    let elapsed = 0;
    analysisStages.slice(0, -1).forEach((stage, index) => {
      elapsed += stage.durationMs;
      timers.current.push(setTimeout(() => setStageIndex(index + 1), elapsed));
    });

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [attempt]);

  // Analisis y navegacion al resultado.
  useEffect(() => {
    let active = true;

    // Sin URL no hay nada que analizar: se vuelve al escaner en vez de pedirle
    // al backend que analice una cadena vacia. Pasa si se entra directo a esta
    // ruta sin haber escaneado (un enlace profundo, o recargar en desarrollo).
    if (!analyzedUrl.trim()) {
      router.replace('/scanner');
      return;
    }

    // El lugar se resuelve EN PARALELO al analisis: es informacion secundaria
    // y no puede retrasar el veredicto. Si falla o tarda, queda en null.
    const placePromise = locationEnabled
      ? getCurrentPlaceName()
      : Promise.resolve<string | null>(null);

    void Promise.all([remoteAnalysisService.analyze(analyzedUrl), placePromise])
      .then(([analysis, place]) => {
        if (!active) return;
        // El analisis termino de verdad: se cierra la cascada completa.
        setStageIndex(analysisStages.length);
        setResult(analysis);
        // El historial se escribe aqui, que es donde el analisis termina: una
        // sola vez por escaneo y ya con el veredicto definitivo.
        addScan(analysis, place);
        router.replace('/analysis/result');
      })
      .catch((cause: unknown) => {
        if (!active) return;

        const error =
          cause instanceof ApiError
            ? cause
            : new ApiError('UNKNOWN', 'El análisis no pudo completarse.', true, null);

        // La persona ya salio de la pantalla: no hay a quien avisarle.
        if (error.code === 'CANCELLED') return;

        // INVALID_URL: el backend dice que el QR no llevaba un enlace
        // analizable, asi que va a la pantalla de contenido.
        if (error.code === 'INVALID_URL') {
          const classified = classifyQr(analyzedUrl);
          if (classified.kind !== 'url') setNonUrlContent(classified.content);
          router.replace('/qr/non-url');
          return;
        }

        /*
         * Cualquier otro fallo (sin internet, servidor caido o sin veredicto):
         * un aviso. No hay resultado ni entrada en el historial: un veredicto
         * que no se pudo calcular no se muestra. Si el fallo es pasajero se
         * ofrece reintentar con la misma URL: el QR puede ya no estar a mano.
         */
        const backToScanner = () => router.replace('/scanner');
        Alert.alert(
          error.code === 'NETWORK' ? 'Sin conexión' : 'No pudimos analizar el enlace',
          analysisErrorMessage(error),
          error.retryable
            ? [
                { text: 'Volver al escáner', style: 'cancel', onPress: backToScanner },
                { text: 'Reintentar', onPress: () => setAttempt((n) => n + 1) },
              ]
            : [{ text: 'Entendido', onPress: backToScanner }],
          { cancelable: false },
        );
      });

    return () => {
      active = false;
    };
  }, [analyzedUrl, attempt, router, setResult, addScan, locationEnabled, setNonUrlContent]);

  const cancel = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/scanner');
  };

  const statusOf = (index: number): StageStatus => {
    if (index < stageIndex) return 'done';
    if (index === stageIndex) return 'running';
    return 'pending';
  };

  return (
    <Screen>
      <ScreenHeader title="Analizando el enlace…" leading={<Spinner size={22} />} />

      <View style={styles.top}>
        <UrlChip url={analyzedUrl} muted />

        <Text style={[text.caption, styles.centered]}>
          {takingLong
            ? 'Esto está tardando un poco más de lo normal. Seguimos revisando el enlace en un entorno aislado.'
            : 'Suele tardar unos 30 segundos. Revisamos el enlace desde nuestro servidor; el sitio no se abre en tu teléfono.'}
        </Text>

        <Card style={styles.stages}>
          {analysisStages.map((stage, index) => {
            const status = statusOf(index);
            return (
              <View key={stage.key} style={styles.stageRow}>
                <StageIndicator status={status} />
                <Text style={[styles.stageLabel, stageLabelStyle(status)]}>
                  {status === 'running' ? stage.runningLabel : stage.doneLabel}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>

      {/* Esqueleto de la pantalla de resultado que esta por llegar. */}
      <View style={styles.skeletonArea} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Skeleton width={92} height={92} borderRadius={46} />
        <Skeleton width={110} height={26} borderRadius={radius.pill} />
        <Skeleton width={190} height={18} borderRadius={9} />
        <Skeleton width={250} height={13} borderRadius={7} />
        <Skeleton width={220} height={13} borderRadius={7} />
      </View>

      {/*
        Salida explicita. El analisis tarda 24-35 s y la pantalla no tiene boton
        de retroceso (el spinner ocupa su lugar): en iOS no habia forma visible
        de arrepentirse. Al desmontar, el efecto descarta la respuesta, asi que
        no se guarda nada en el historial.
      */}
      <View style={styles.footer}>
        <Button label="Cancelar análisis" variant="secondary" onPress={cancel} />
      </View>
    </Screen>
  );
}

function StageIndicator({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return <CheckCircleIcon size={18} />;
  }
  if (status === 'running') {
    return <Spinner size={18} thickness={2.5} />;
  }
  return (
    <Svg width={18} height={18}>
      <Circle
        cx={9}
        cy={9}
        r={7.5}
        stroke={palette.iconMuted}
        strokeWidth={2}
        strokeDasharray="3 3"
        fill="none"
      />
    </Svg>
  );
}

function stageLabelStyle(status: StageStatus) {
  if (status === 'running') {
    return { fontFamily: text.cardTitle.fontFamily, color: palette.textPrimary };
  }
  if (status === 'done') {
    return { fontFamily: text.captionMd.fontFamily, color: palette.textBody };
  }
  return { fontFamily: text.captionMd.fontFamily, color: palette.textPlaceholder };
}

const styles = StyleSheet.create({
  top: {
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
  },
  centered: {
    textAlign: 'center',
  },
  stages: {
    gap: spacing.md,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stageLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
  },
  skeletonArea: {
    flex: 1,
    alignItems: 'center',
    gap: 14,
    paddingTop: 26,
    paddingHorizontal: 24,
  },
  footer: {
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 24,
  },
});
