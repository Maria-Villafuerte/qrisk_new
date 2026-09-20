import Storage from 'expo-sqlite/kv-store';

/**
 * Recuerda si el usuario concedio la ubicacion durante el onboarding.
 *
 * Existe por una regresion concreta: al hacer que el onboarding corriera una
 * sola vez (`onboardingStorage`), `locationEnabled` se quedo viviendo solo en
 * memoria. Como el onboarding ya no se repite, nadie volvia a llamar a
 * `setLocationEnabled`, asi que tras el primer reinicio el historial dejaba de
 * guardar el lugar del escaneo PARA SIEMPRE, y en silencio. Las dos
 * persistencias tienen que ir juntas.
 *
 * Mismo kv-store sincrono que el historial y el onboarding: el valor se lee en
 * el primer render de `AppStateContext`, asi que no puede ser asincrono sin
 * provocar un parpadeo.
 */

/** Clave unica. Lleva version para poder migrar el formato sin romper. */
const LOCATION_KEY = 'qrisk.location.v1';

/**
 * Si el usuario concedio la ubicacion. Ante cualquier fallo de lectura
 * devuelve `false`: perder el nombre del lugar en el historial es molesto pero
 * inocuo, mientras que asumir un permiso que no se tiene haria que la app
 * intentara geolocalizar sin derecho a hacerlo.
 *
 * Es el permiso que la app CREE tener, no el del sistema operativo: si el
 * usuario lo revoca desde Ajustes, `getCurrentPlaceName()` falla y devuelve
 * `null`, que es justo el caso que la UI ya sabe ocultar.
 */
export function hasLocationEnabled(): boolean {
  try {
    return Storage.getItemSync(LOCATION_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Guarda la decision del usuario sobre la ubicacion. */
export function setLocationEnabledStored(enabled: boolean): void {
  try {
    Storage.setItemSync(LOCATION_KEY, enabled ? 'true' : 'false');
  } catch {
    // Si no se pudo guardar, el historial deja de anotar el lugar en el
    // proximo arranque. Es el fallo benigno: molesta, pero no rompe nada.
  }
}
