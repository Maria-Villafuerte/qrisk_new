import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  consumeLeftByApp,
  noteBackground,
  shouldReturnToScanner,
} from '../../services/navigation/resumePolicy';

/**
 * Al volver a QRisk desde segundo plano, lleva al escaner.
 *
 * El arranque en frio ya entra por `app/index.tsx`; esto cubre el caso en que
 * Android conservo el proceso y el stack seguia en la ultima pantalla. Las
 * excepciones (onboarding, analisis en curso, galeria, compartir, navegador)
 * se deciden en `resumePolicy.ts`.
 *
 * No pinta nada: se monta una vez en el layout raiz.
 */
export function ReturnToScannerOnResume() {
  const pathname = usePathname();
  // Ref para que el listener lea la ruta actual sin re-suscribirse en cada
  // navegacion.
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Solo cuenta una salida real a segundo plano. 'inactive' (iOS, el centro
    // de control o un dialogo del sistema) no mueve a nadie.
    let wentToBackground = false;

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wentToBackground = true;
        noteBackground();
        return;
      }
      if (next !== 'active' || !wentToBackground) return;
      wentToBackground = false;

      if (consumeLeftByApp()) return;
      if (!shouldReturnToScanner(pathnameRef.current)) return;

      // Saca del stack todo lo que hay encima del escaner; si no estuviera,
      // navega a el.
      router.dismissTo('/scanner');
    });

    return () => subscription.remove();
  }, []);

  return null;
}
