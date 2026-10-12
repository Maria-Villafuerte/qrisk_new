import * as Location from 'expo-location';
import { composePlaceName } from './placeName';

/**
 * Nombre del lugar del escaneo, resuelto EN EL DISPOSITIVO.
 *
 * La geocodificacion inversa la hace el sistema operativo
 * (`Location.reverseGeocodeAsync`), no un servidor: mandar las coordenadas del
 * usuario seria incoherente con el resto del producto, que evita con cuidado
 * recolectar datos. Ver endpoints_api.txt seccion 4.3.
 */

/**
 * Devuelve el lugar legible, o null si no se puede.
 *
 * Nunca lanza: el lugar es informacion secundaria y no puede romper un
 * escaneo. Ante permiso denegado, GPS apagado o geocodificacion vacia,
 * devuelve null y la UI oculta la fila.
 */
export async function getCurrentPlaceName(): Promise<string | null> {
  try {
    /*
     * CONSULTA el permiso, no lo PIDE.
     *
     * Antes se llamaba a `requestForegroundPermissionsAsync`, que muestra el
     * dialogo del sistema cuando el permiso no esta concedido. Como esto corre
     * durante el primer analisis, el dialogo aparecia encima de la pantalla de
     * carga, segundos despues de que la persona ya habia respondido en el
     * onboarding: pedia dos veces lo mismo y la segunda vez sin contexto.
     *
     * El permiso se pide donde se explica: `app/onboarding/location.tsx`. Aqui
     * solo se comprueba. Si no esta concedido —se omitio en el onboarding o se
     * revoco despues en ajustes— se devuelve null sin interrumpir nada, que es
     * lo que corresponde a un dato secundario.
     */
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const [address] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    return composePlaceName(address);
  } catch {
    // Sin senal, sin servicio de geocodificacion o permiso revocado a mitad:
    // el escaneo sigue, simplemente sin lugar.
    return null;
  }
}
