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
    // En Android el permiso es obligatorio ANTES de geocodificar.
    const { granted } = await Location.requestForegroundPermissionsAsync();
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
