import { Redirect } from 'expo-router';
import { hasSeenOnboarding } from '../src/services/storage/onboardingStorage';

/**
 * Punto de entrada. El onboarding se muestra una sola vez: la lectura del
 * kv-store es sincrona, asi que la decision se toma en el primer render y el
 * usuario no ve un parpadeo de la pantalla equivocada.
 *
 * Para volver a recorrerlo (una demo, una prueba de usabilidad) hay que
 * limpiar el dato: `resetOnboarding()` desde el debugger, o desinstalar la app.
 */
export default function Index() {
  return <Redirect href={hasSeenOnboarding() ? '/scanner' : '/onboarding/camera'} />;
}
