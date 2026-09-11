import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [permission, requestPermission] = useCameraPermissions();

  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState(false);

  /**
   * onBarcodeScanned dispara muchas veces por segundo mientras el QR siga a
   * la vista. Esta bandera corta todas las lecturas posteriores a la primera.
   * Va en un ref y no en el estado porque debe bloquear ya en la llamada
   * siguiente, sin esperar a un re-render.
   */
  const lockedRef = useRef(false);

  // Al volver al escaner (por ejemplo desde el historial) hay que rearmarlo:
  // la pantalla queda montada y sin esto no volveria a leer nunca.
  useFocusEffect(
    useCallback(() => {
      lockedRef.current = false;
      setDetected(false);
      setTorchOn(false);
      markScanStarted();

      return () => {
        lockedRef.current = true;
      };
    }, []),
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
        router.push({ pathname: '/analysis/loading', params: { url: classified.url } });
        return;
      }

      setNonUrlContent(classified.content);
      router.push('/qr/non-url');
    },
    [router, setNonUrlContent],
  );

  // Primer render: el hook aun no sabe el estado del permiso.
  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
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
              QRisk necesita el permiso de cámara para leer códigos QR. Las imágenes no salen
              de tu teléfono ni se guardan.
            </Text>
          </View>
          <View style={styles.deniedFooter}>
            <Button label="Permitir la cámara" onPress={() => void requestPermission()} />
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

      {/* Vela el video fuera del marco para que el QR sea el foco visual. */}
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver historial"
            onPress={() => router.push('/history')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <ClockIcon size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.center}>
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
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: 'rgba(255,255,255,0.6)',
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
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
  },
});
