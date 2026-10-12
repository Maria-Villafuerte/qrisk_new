import { useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LocationIcon, LockIcon, palette, useToast } from '../../src/design-system';
import { PermissionScreen } from '../../src/features/onboarding/PermissionScreen';
import { markOnboardingSeen } from '../../src/services/storage/onboardingStorage';
import { useAppState } from '../../src/store/AppStateContext';

/**
 * 02 · Permiso de ubicacion (opcional). La eleccion sí tiene efecto: decide
 * si el historial y la Story Card muestran el lugar del escaneo.
 *
 * PIDE EL PERMISO AQUI, igual que la pantalla de camara. Antes solo guardaba
 * `locationEnabled = true` y navegaba al escaner: el dialogo del sistema
 * aparecia despues, encima de la camara, cuando el primer analisis llamaba al
 * GPS. Eso dejaba a la persona respondiendo un permiso sin el contexto de la
 * pantalla que lo explicaba, y varios segundos despues de haberlo concedido.
 */
export default function LocationPermissionRoute() {
  const router = useRouter();
  const toast = useToast();
  const { setLocationEnabled } = useAppState();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  /**
   * Ultima pantalla del onboarding: se marca aqui, con cualquiera de las dos
   * respuestas. Omitir la ubicacion tambien es haber completado el flujo.
   */
  const goToScanner = (enabled: boolean) => {
    setLocationEnabled(enabled);
    markOnboardingSeen();
    router.replace('/scanner');
  };

  /**
   * Pide el permiso real del sistema y guarda la respuesta.
   *
   * `locationEnabled` guarda lo que el SISTEMA concedio, no lo que la persona
   * toco: si acepta en la app pero niega en el dialogo, el valor es false. Si
   * guardara true, el historial intentaria resolver el lugar en cada escaneo y
   * fallaria siempre en silencio.
   */
  const ask = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await Location.requestForegroundPermissionsAsync();

      if (response.granted) {
        goToScanner(true);
        return;
      }

      // Android e iOS dejan de mostrar el dialogo tras la segunda negativa: a
      // partir de ahi `canAskAgain` es false y solo se resuelve en ajustes.
      if (!response.canAskAgain) {
        setBlocked(true);
        return;
      }

      // Negado pero se puede volver a preguntar. La ubicacion es opcional, asi
      // que no se insiste: se entra al escaner sin ella.
      toast.show('Sin ubicación, el historial no mostrará el lugar');
      goToScanner(false);
    } finally {
      setBusy(false);
    }
  };

  if (blocked) {
    return (
      <PermissionScreen
        step={2}
        badge="OPCIONAL"
        icon={<LocationIcon size={46} color={palette.brand} />}
        title="Activa la ubicación desde ajustes"
        description="El permiso de ubicación está bloqueado. Si quieres ver el nombre del lugar en tu historial, actívalo en los ajustes del sistema. La app funciona igual sin este permiso."
        note={{
          icon: <LockIcon size={16} />,
          text: 'La ubicación se resuelve en tu teléfono, nunca en un servidor.',
        }}
        primaryLabel="Abrir ajustes"
        secondaryLabel="Continuar sin ubicación"
        onPrimary={() => void Linking.openSettings()}
        onSecondary={() => goToScanner(false)}
      />
    );
  }

  return (
    <PermissionScreen
      step={2}
      badge="OPCIONAL"
      icon={<LocationIcon size={46} color={palette.brand} />}
      title="¿Recordar dónde escaneas?"
      description="Con tu ubicación podemos mostrar el nombre del lugar en tu historial y en las Story Cards que compartas. La app funciona igual sin este permiso."
      note={{
        icon: <LockIcon size={16} />,
        text: 'La ubicación se resuelve en tu teléfono, nunca en un servidor.',
      }}
      primaryLabel="Conceder permiso"
      secondaryLabel="Omitir"
      onPrimary={() => void ask()}
      onSecondary={() => goToScanner(false)}
    />
  );
}
