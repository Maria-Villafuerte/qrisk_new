import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BrandMark,
  Button,
  CameraIcon,
  ClockIcon,
  fontFamily,
  FlashlightIcon,
  palette,
  radius,
  Screen,
  spacing,
} from '../src/design-system';
import { ScannerFrame, SCANNER_FRAME_SIZE } from '../src/features/scanner/ScannerFrame';
import { hasConnection } from '../src/services/api/connectivity';
import { classifyQr } from '../src/services/qr';
import { markScanDetected, markScanStarted } from '../src/services/qr/scanMetrics';
import { useAppState } from '../src/store/AppStateContext';

/**
 * 03 · Escaner. Es la pantalla de inicio del flujo: monta la camara real y
 * clasifica lo que lee. Los enlaces pasan al analisis; el resto va a la
 * pantalla de contenido del QR.
 */
export default function ScannerRoute() {
  const router = useRouter();
  const { setNonUrlContent } = useAppState();
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState(false);

  /**
   * onBarcodeScanned dispara muchas veces por segundo mientras el QR siga a
   * la vista. Esta bandera corta todas las lecturas posteriores a la primera.
   * Va en un ref y no en el estado porque debe bloquear ya en la llamada
   * siguiente, sin esperar a un re-render.
   */
  const lockedRef = useRef(false);

  // Si la pantalla sigue a la vista. La comprobacion de red es asincrona: si la
  // persona se fue al historial mientras tanto, no se navega por detras.
  const focusedRef = useRef(false);

  /** Vuelve a dejar el escaner listo para leer, tras un aviso. */
  const rearm = useCallback(() => {
    lockedRef.current = false;
    setDetected(false);
  }, []);

  // Al volver al escaner (por ejemplo desde el historial) hay que rearmarlo:
  // la pantalla queda montada y sin esto no volveria a leer nunca.
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      lockedRef.current = false;
      setDetected(false);
      setTorchOn(false);
      markScanStarted();

      return () => {
        focusedRef.current = false;
        lockedRef.current = true;
      };
    }, []),
  );

  /*
   * Sin internet el analisis no puede hacerse: la persona se queda en el
   * escaner con un aviso, en vez de entrar a "Analizando el enlace" y esperar
   * algo que no va a llegar. "Reintentar" vuelve a comprobar la red con la
   * misma URL, sin tener que apuntar otra vez al codigo; "Cancelar" rearma.
   */
  const analyzeWhenOnline = useCallback(
    (url: string) => {
      void hasConnection().then((online) => {
        if (!focusedRef.current) return;
        if (!online) {
          Alert.alert(
            'Sin conexión',
            'No pudimos revisar este código porque no hay conexión. Esto no significa que sea seguro.',
            [
              { text: 'Cancelar', style: 'cancel', onPress: rearm },
              { text: 'Reintentar', onPress: () => analyzeWhenOnline(url) },
            ],
            { cancelable: false },
          );
          return;
        }
        router.push({ pathname: '/analysis/loading', params: { url } });
      });
    },
    [router, rearm],
  );

  const handleScan = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (lockedRef.current) return;
      lockedRef.current = true;

      // Cierra la medicion de T_scan: desde que la pantalla quedo lista
      // hasta que la camara entrego un codigo.
      markScanDetected(data);
      setDetected(true);

      const classified = classifyQr(data);

      if (classified.kind === 'url') {
        analyzeWhenOnline(classified.url);
        return;
      }

      setNonUrlContent(classified.content);
      router.push('/qr/non-url');
    },
    [router, setNonUrlContent, analyzeWhenOnline],
  );

  // El permiso se puede conceder fuera de la app (en ajustes). El hook no se
  // entera solo: se relee al volver a primer plano para que la camara arranque
  // sin tener que salir y entrar de la pantalla.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  // Primer render: el hook aun no sabe el estado del permiso.
  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    // Tras la segunda negativa el sistema ya no muestra el dialogo: pedir el
    // permiso no haria nada y el boton quedaba muerto. Solo queda ir a ajustes.
    const blocked = !permission.canAskAgain;
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={[palette.scannerTop, palette.scannerMid, palette.scannerBottom]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Screen dark>
          <View style={styles.deniedBody}>
            <CameraIcon size={46} color="#FFFFFF" />
            <Text style={styles.deniedTitle}>La cámara está apagada</Text>
            <Text style={styles.deniedText}>
              {blocked
                ? 'El permiso de cámara está bloqueado. Actívalo en los ajustes del sistema y vuelve a QRisk.'
                : 'QRisk necesita el permiso de cámara para leer códigos QR. Las imágenes no salen de tu teléfono ni se guardan.'}
            </Text>
          </View>
          <View style={styles.deniedFooter}>
            {blocked ? (
              <Button label="Abrir ajustes" onPress={() => void Linking.openSettings()} />
            ) : (
              <Button label="Permitir la cámara" onPress={() => void requestPermission()} />
            )}
            {/* Sin camara, el historial seguia siendo util pero no habia como llegar. */}
            <Button
              label="Ver historial"
              variant="ghost"
              accentColor="#FFFFFF"
              onPress={() => router.push('/history')}
            />
          </View>
        </Screen>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        // Una vez bloqueado se desconecta el callback: es mas barato que
        // recibir decenas de lecturas por segundo y descartarlas.
        onBarcodeScanned={detected ? undefined : handleScan}
      />

      {/*
        Velo uniforme sobre todo el video, ventana incluida. Se probo recortar
        un hueco sin velo dentro del marco y se descarto: el cuadrado de otro
        tono en el centro se veia peor que el fondo parejo.
      */}
      <LinearGradient
        colors={[palette.scannerTop, palette.scannerMid, palette.scannerBottom]}
        locations={[0, 0.45, 1]}
        style={[StyleSheet.absoluteFill, styles.scrim]}
        pointerEvents="none"
      />

      <Screen dark>
        <View style={styles.topBar}>
          <View style={styles.brandChip}>
            <BrandMark size={18} color="#FFFFFF" moduleColor={palette.brand} />
            <Text style={styles.brandName}>QRisk</Text>
          </View>

          {/*
            Con texto y no solo el reloj: en la prueba de usabilidad el icono
            solo no se reconocia como la entrada al historial.
          */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver historial"
            onPress={() => router.push('/history')}
            hitSlop={6}
            style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}
          >
            <ClockIcon size={20} color="#FFFFFF" />
            <Text style={styles.historyLabel}>Historial</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <Text style={styles.tagline}>Revisa si un código QR es seguro antes de abrirlo</Text>

          {/* Ventana del marco: el video se ve a traves del velo mas claro. */}
          <View style={styles.window}>
            <ScannerFrame paused={detected} />
          </View>

          <Text style={styles.hint}>
            {detected ? 'Código detectado' : 'Apunta al código QR'}
          </Text>

          <View style={styles.statusChip}>
            <View style={[styles.statusDot, detected && styles.statusDotBusy]} />
            <Text style={styles.statusText}>
              {detected ? 'Leyendo…' : 'Listo para escanear'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torchOn ? 'Apagar la linterna' : 'Encender la linterna'}
            accessibilityState={{ selected: torchOn }}
            onPress={() => setTorchOn((on) => !on)}
            style={({ pressed }) => [
              styles.torchButton,
              torchOn && styles.torchButtonOn,
              pressed && styles.pressed,
            ]}
          >
            <FlashlightIcon size={24} color={torchOn ? palette.scannerBottom : undefined} />
          </Pressable>
          <Text style={styles.torchLabel}>Linterna</Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.scannerBottom,
  },
  scrim: {
    opacity: 0.72,
  },
  window: {
    width: SCANNER_FRAME_SIZE,
    height: SCANNER_FRAME_SIZE,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  brandName: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  historyLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  tagline: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  pressed: {
    opacity: 0.7,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  hint: {
    fontFamily: fontFamily.medium,
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.85)',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.online,
  },
  statusDotBusy: {
    backgroundColor: palette.brand,
  },
  statusText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: 24,
  },
  torchButton: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButtonOn: {
    backgroundColor: '#FFFFFF',
  },
  torchLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    // Va sobre el video de la camara: con 0.6 se perdia sobre fondos claros.
    color: 'rgba(255,255,255,0.85)',
  },
  deniedBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: 32,
  },
  deniedTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 21,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  deniedText: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  deniedFooter: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
  },
});
