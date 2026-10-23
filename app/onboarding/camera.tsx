import { useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { CameraIcon, LockIcon, palette, useToast } from '../../src/design-system';
import { PermissionScreen } from '../../src/features/onboarding/PermissionScreen';

/**
 * 01 · Permiso de camara. Pide el permiso real del sistema y contempla los
 * tres estados posibles: concedido, denegado (se puede volver a preguntar) y
 * denegado de forma permanente, que ya solo se resuelve en los ajustes.
 */
export default function CameraPermissionRoute() {
  const router = useRouter();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  // `replace`, no `push`: el permiso ya se respondio y esta pantalla no debe
  // quedar debajo del escaner. Con `push`, el boton atras del telefono desde el
  // escaner volvia a mostrar el permiso de camara.
  const goNext = () => router.replace('/onboarding/location');

  // Android e iOS dejan de mostrar el dialogo tras la segunda negativa: a
  // partir de ahi canAskAgain es false y hay que mandar a los ajustes.
  const blocked = permission != null && !permission.granted && !permission.canAskAgain;

  const ask = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await requestPermission();
      if (response.granted) {
        goNext();
        return;
      }
      if (!response.canAskAgain) {
        // El siguiente render ya muestra el copy de ajustes.
        return;
      }
      toast.show('Sin la cámara no es posible escanear códigos QR');
    } finally {
      setBusy(false);
    }
  };

  if (blocked) {
    return (
      <PermissionScreen
        step={1}
        icon={<CameraIcon size={46} color={palette.brand} />}
        title="Activa la cámara desde ajustes"
        description="El permiso de cámara está bloqueado. Para escanear códigos QR, actívalo en los ajustes del sistema y vuelve a QRisk."
        note={{
          icon: <LockIcon size={16} />,
          text: 'Las imágenes no salen de tu teléfono ni se guardan.',
        }}
        primaryLabel="Abrir ajustes"
        secondaryLabel="Más tarde"
        onPrimary={() => void Linking.openSettings()}
        onSecondary={goNext}
      />
    );
  }

  return (
    <PermissionScreen
      step={1}
      icon={<CameraIcon size={46} color={palette.brand} />}
      title="Permite el acceso a la cámara"
      description="QRisk usa la cámara únicamente para leer códigos QR. Sin este permiso no es posible escanear."
      note={{
        icon: <LockIcon size={16} />,
        text: 'Las imágenes no salen de tu teléfono ni se guardan.',
      }}
      primaryLabel="Conceder permiso"
      secondaryLabel="Más tarde"
      onPrimary={() => void ask()}
      onSecondary={goNext}
    />
  );
}
