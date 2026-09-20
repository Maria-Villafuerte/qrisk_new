import { useRouter } from 'expo-router';
import { LocationIcon, palette } from '../../src/design-system';
import { PermissionScreen } from '../../src/features/onboarding/PermissionScreen';
import { markOnboardingSeen } from '../../src/services/storage/onboardingStorage';
import { useAppState } from '../../src/store/AppStateContext';

/**
 * 02 · Permiso de ubicacion (opcional). La eleccion sí tiene efecto: decide
 * si el historial y la Story Card muestran el lugar del escaneo.
 */
export default function LocationPermissionRoute() {
  const router = useRouter();
  const { setLocationEnabled } = useAppState();

  // Ultima pantalla del onboarding: se marca aqui, con cualquiera de las dos
  // respuestas. Omitir la ubicacion tambien es haber completado el flujo.
  const goToScanner = (enabled: boolean) => {
    setLocationEnabled(enabled);
    markOnboardingSeen();
    router.replace('/scanner');
  };

  return (
    <PermissionScreen
      step={2}
      badge="OPCIONAL"
      icon={<LocationIcon size={46} color={palette.brand} />}
      title="¿Recordar dónde escaneas?"
      description="Con tu ubicación podemos mostrar el nombre del lugar en tu historial y en las Story Cards que compartas. La app funciona igual sin este permiso."
      primaryLabel="Conceder permiso"
      secondaryLabel="Omitir"
      onPrimary={() => goToScanner(true)}
      onSecondary={() => goToScanner(false)}
    />
  );
}
