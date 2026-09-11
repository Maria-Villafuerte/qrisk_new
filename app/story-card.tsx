import React, { useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import {
  BrandMark,
  Button,
  CameraIcon,
  DownloadIcon,
  fontFamily,
  GalleryIcon,
  LocationIcon,
  palette,
  QrPattern,
  radius,
  Screen,
  ScreenHeader,
  ShareIcon,
  spacing,
  useToast,
  VerdictShield,
  verdicts,
} from '../src/design-system';
import { formatScanTime } from '../src/services/format/relativeTime';
import { useAppState } from '../src/store/AppStateContext';

const CARD_WIDTH = 238;
/** Proporcion 9:16 de una historia. */
const CARD_HEIGHT = 423;

/**
 * 10 · Story Card compartible. El QR se difumina a proposito: la tarjeta
 * advierte del codigo sin volverlo escaneable para quien la vea.
 */
export default function StoryCardRoute() {
  const router = useRouter();
  const toast = useToast();
  const { result, locationEnabled, history } = useAppState();
  const theme = verdicts[result.verdict];

  /** Referencia a la tarjeta: es lo que se captura como imagen. */
  const cardRef = useRef<View>(null);
  /** Foto de contexto elegida. Nunca sale del telefono. */
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // El escaneo mas reciente es el que corresponde a esta tarjeta.
  const lastScan = history[0]?.record;
  const scannedLabel = lastScan ? formatScanTime(lastScan.scannedAt) : formatScanTime(new Date().toISOString());
  const place = lastScan?.place ?? null;

  /** Toma la foto con la camara. */
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.show('Sin permiso de cámara no se puede tomar la foto');
        return;
      }

      const picked = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!picked.canceled && picked.assets[0]) setPhotoUri(picked.assets[0].uri);
    } catch {
      // En Android el sistema puede matar la Activity mientras se toma la foto.
      toast.show('No se pudo tomar la foto');
    }
  };

  /** Elige la foto de la galeria. */
  const pickPhoto = async () => {
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!picked.canceled && picked.assets[0]) setPhotoUri(picked.assets[0].uri);
    } catch {
      toast.show('No se pudo abrir la galería');
    }
  };

  /** Captura la tarjeta como PNG y devuelve la ruta del archivo temporal. */
  const captureCard = async (): Promise<string> =>
    captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });

  /** Comparte la tarjeta con la hoja del sistema. */
  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        toast.show('Compartir no está disponible en este dispositivo');
        return;
      }
      const uri = await captureCard();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir Story Card' });
    } catch {
      toast.show('No se pudo compartir la Story Card');
    } finally {
      setBusy(false);
    }
  };

  /** Guarda la tarjeta en la galeria del telefono. */
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Solo hace falta permiso de escritura: la app no lee la galeria.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        toast.show('Sin permiso no se puede guardar en tu galería');
        return;
      }

      const uri = await captureCard();
      await MediaLibrary.Asset.create(uri);
      toast.show('Story Card guardada en tu galería');
    } catch {
      toast.show('No se pudo guardar la Story Card');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Story Card" onBack={() => router.back()} />

      <View style={styles.body}>
        <View style={styles.card} ref={cardRef} collapsable={false}>
          <LinearGradient
            colors={[palette.storyTop, palette.storyMid, palette.storyBottom]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cardBrand}>
            <BrandMark size={13} color="#FFFFFF" moduleColor={palette.brand} />
            <Text style={styles.cardBrandName}>QRisk</Text>
          </View>

          {photoUri ? (
            // La foto de contexto se pinta dentro de la tarjeta; el degradado
            // inferior mantiene legible el texto que va encima.
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={styles.photoHint}>
              <CameraIcon size={10} color="rgba(255,255,255,0.65)" strokeWidth={2} />
              <Text style={styles.photoHintText}>Agrega una foto de contexto</Text>
            </View>
          )}

          {/*
            El QR se muestra pero queda inservible: React Native no aplica
            desenfoque real a una vista, asi que en vez de simularlo se cubre
            con una capa opaca. Un QR medio difuminado seguiria siendo
            escaneable, y eso es justo lo que la tarjeta debe evitar.
          */}
          <View style={styles.qrHolder}>
            <View style={styles.qrPattern}>
              <QrPattern size={86} />
              <View style={styles.qrScreen} />
            </View>
            <View style={styles.qrBadge}>
              <Text style={styles.qrBadgeText}>QR oculto</Text>
            </View>
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(10,12,18,0.88)']}
            locations={[0, 0.55]}
            style={styles.cardFooter}
          >
            <View style={[styles.cardPill, { backgroundColor: theme.tint }]}>
              <VerdictShield
                verdict={result.verdict}
                size={10}
                color={theme.color}
                strokeWidth={3}
              />
              <Text style={[styles.cardPillText, { color: theme.color }]}>
                QR {theme.label} DETECTADO
              </Text>
            </View>

            <Text style={styles.cardDomain}>{result.domain}</Text>

            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>{scannedLabel}</Text>
              {locationEnabled && place ? (
                <>
                  <Text style={styles.cardMetaText}>·</Text>
                  <View style={styles.cardPlace}>
                    <LocationIcon size={9} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {place}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            <Text style={styles.cardSignature}>Analizado con QRisk · escanea con cuidado</Text>
          </LinearGradient>
        </View>

        <View style={styles.photoActions}>
          <Button
            label="Tomar foto"
            variant="secondary"
            compact
            icon={<CameraIcon size={15} color={palette.textPrimary} />}
            onPress={takePhoto}
            style={styles.flex}
          />
          <Button
            label="Galería"
            variant="secondary"
            compact
            icon={<GalleryIcon size={15} />}
            onPress={pickPhoto}
            style={styles.flex}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Compartir"
          icon={<ShareIcon size={17} />}
          onPress={share}
          disabled={busy}
          style={styles.flex}
        />
        <Button
          label="Guardar"
          variant="secondary"
          icon={<DownloadIcon size={17} />}
          onPress={save}
          disabled={busy}
          style={styles.flex}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  cardBrand: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  cardBrandName: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  photoHint: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoHintText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
  },
  qrHolder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -53 }, { translateY: -110 }],
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPattern: {
    width: 86,
    height: 86,
    borderRadius: 6,
    overflow: 'hidden',
  },
  qrScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(216,212,204,0.94)',
  },
  qrBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(25,28,34,0.85)',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  qrBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  cardFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 40,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  cardPillText: {
    fontFamily: fontFamily.extrabold,
    fontSize: 9.5,
    letterSpacing: 0.57,
  },
  cardDomain: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardPlace: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardMetaText: {
    fontFamily: fontFamily.regular,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
  },
  cardSignature: {
    fontFamily: fontFamily.medium,
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 6,
    marginTop: 2,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 300,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: spacing.xl,
    paddingTop: 14,
    paddingBottom: 24,
  },
});
