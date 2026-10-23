import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import {
  Card,
  CheckCircleIcon,
  palette,
  radius,
  Screen,
  ScreenHeader,
  sizing,
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
 * Son 20 s, no los 8 de antes. Con la cascada completa (medida el 2026-10-11:
 * 24-35 s en el camino normal) un aviso a los 8 s salia practicamente siempre,
 * y un aviso que aparece en casi todos los analisis deja de informar: se
 * vuelve parte del fondo y la persona ya no distingue el caso lento del
 * normal. A los 20 s ya se paso la mitad del peor caso medido y la espera si
 * es inusual.
 */
const LONG_WAIT_NOTICE_MS = 20_000;

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
   * Aviso de espera larga.
   *
   * Un sitio que el backend no vio antes tarda ~15 s, porque F2.3 le toma una
   * captura con un navegador headless. Sin decir nada, quince segundos de
   * spinner se leen como "la app se colgo" y la persona cierra o reintenta.
   * A los 8 s se explica que sigue trabajando y por que tarda.
   */
  useEffect(() => {
    const timer = setTimeout(() => setTakingLong(true), LONG_WAIT_NOTICE_MS);
    return () => clearTimeout(timer);
  }, []);

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
    let elapsed = 0;
    analysisStages.slice(0, -1).forEach((stage, index) => {
      elapsed += stage.durationMs;
      timers.current.push(setTimeout(() => setStageIndex(index + 1), elapsed));
    });

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

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
         * un aviso y de vuelta al escaner. No hay resultado ni entrada en el
         * historial: un veredicto que no se pudo calcular no se muestra.
         */
        Alert.alert(
          error.code === 'NETWORK' ? 'Error: Sin conexión' : 'No pudimos analizar el enlace',
          analysisErrorMessage(error),
          [{ text: 'Entendido', onPress: () => router.replace('/scanner') }],
          { cancelable: false },
        );
      });

    return () => {
      active = false;
    };
  }, [analyzedUrl, router, setResult, addScan, locationEnabled, setNonUrlContent]);

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
            : 'Revisamos el enlace desde nuestro servidor. El sitio no se abre en tu teléfono.'}
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

      <View style={styles.footer}>
        <Skeleton height={sizing.buttonHeight} borderRadius={radius.lg} />
        <Skeleton height={sizing.buttonHeight} borderRadius={radius.lg} style={styles.faded} />
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
        stroke="#D5D0C6"
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
  faded: {
    opacity: 0.6,
  },
});
