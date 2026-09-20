import Storage from 'expo-sqlite/kv-store';

/**
 * Recuerda si el usuario ya paso por el onboarding.
 *
 * Sin esto la app repite los permisos en cada arranque, que era el atajo del
 * prototipo. Usa el mismo kv-store sincrono que el historial: la decision se
 * toma en el primer render de `app/index.tsx`, antes de redirigir, asi que no
 * puede ser asincrona sin provocar un parpadeo.
 */

/** Clave unica. Lleva version para poder migrar el formato sin romper. */
const ONBOARDING_KEY = 'qrisk.onboarding.v1';

/**
 * Si el onboarding ya se completo. Ante cualquier fallo de lectura devuelve
 * `false`: repetir el onboarding es molesto, pero saltarselo por un error de
 * disco dejaria al usuario sin conceder los permisos que la app necesita.
 */
export function hasSeenOnboarding(): boolean {
  try {
    return Storage.getItemSync(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Marca el onboarding como completado. */
export function markOnboardingSeen(): void {
  try {
    Storage.setItemSync(ONBOARDING_KEY, 'true');
  } catch {
    // Si no se pudo guardar, el onboarding se repite en el proximo arranque.
    // Es el fallo benigno: molesta, pero no rompe nada.
  }
}

/** Olvida el onboarding. Para pruebas y para recorrer el flujo en la defensa. */
export function resetOnboarding(): void {
  try {
    Storage.removeItemSync(ONBOARDING_KEY);
  } catch {
    // Nada que hacer: la proxima lectura sigue devolviendo lo que haya.
  }
}
