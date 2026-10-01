import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { remoteAnalysisService } from '../../src/services/analysis/remoteAnalysisService';
import { ApiError } from '../../src/services/api/errors';
import { getCurrentPlaceName } from '../../src/services/location';
import { classifyQr } from '../../src/services/qr';
import { useAppState } from '../../src/store/AppStateContext';

type StageStatus = 'done' | 'running' | 'pending';

/** Cuanto se espera antes de avisar que el analisis esta tardando. */
const LONG_WAIT_NOTICE_MS = 8_000;

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
   * curso hasta que el analisis responde de verdad. Hoy solo esta activo F1 (ver
   * `enabledFilters.ts`), asi que la lista tiene una sola etapa, `slice` no
   * programa ningun temporizador y esa unica fila gira hasta que llega el
   * veredicto. Es el mismo invariante de siempre: la ultima etapa la cierra el
   * servicio, no el reloj.
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

        // El servicio degrada casi todo a un veredicto "incierto", pero deja
        // subir INVALID_URL: el backend dice que el QR no llevaba un enlace
        // analizable, asi que va a la pantalla de contenido. Sin este catch la
        // pantalla de carga se quedaria girando para siempre.
        if (cause instanceof ApiError && cause.code === 'INVALID_URL') {
          const classified = classifyQr(analyzedUrl);
          if (classified.kind !== 'url') setNonUrlContent(classified.content);
          router.replace('/qr/non-url');
          return;
        }

        // Cualquier otro fallo inesperado: se vuelve al escaner en vez de
        // dejar al usuario atrapado en la espera.
        router.replace('/scanner');
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
            : 'El enlace se analiza en un entorno aislado, no en tu teléfono.'}
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
