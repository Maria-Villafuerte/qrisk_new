/**
 * Composicion del nombre del lugar a partir de una direccion inversa.
 *
 * Es una funcion pura y aparte del modulo de expo-location para poder probar
 * la metrica (">= 85% produce un nombre de lugar legible") sin GPS ni permisos.
 */

/** Los campos de expo-location que interesan. Todos pueden venir en null. */
export interface GeocodedAddress {
  /** Nombre del sitio ("Centro Comercial Miraflores"). */
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  /** Zona o barrio. */
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
}

/** Cuantas partes se juntan como maximo: mas que eso no cabe en la fila. */
const MAX_PARTS = 2;

/** Descarta vacios y repetidos conservando el orden. */
function usable(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

/**
 * Arma un nombre corto y reconocible: lo especifico primero, con una
 * referencia mas amplia detras ("Café Aurora, Zona 4").
 *
 * Devuelve null cuando no hay nada legible; la UI ya sabe ocultar la fila del
 * lugar en ese caso, que es mejor que mostrar coordenadas o un "null".
 */
export function composePlaceName(address: GeocodedAddress | null | undefined): string | null {
  if (!address) return null;

  // La calle con numero se lee mejor junta ("6a avenida 12").
  const street = usable([address.street])[0];
  const streetNumber = usable([address.streetNumber])[0];
  const fullStreet = street && streetNumber ? `${street} ${streetNumber}` : street;

  // De lo mas especifico a lo mas general: el primero que exista manda.
  const specific = usable([address.name, fullStreet])[0];
  const broad = usable([address.district, address.city, address.subregion, address.region])[0];

  const parts = usable([specific, broad]).slice(0, MAX_PARTS);
  if (parts.length === 0) {
    // Sin nada mejor, el pais al menos ubica algo.
    return usable([address.country])[0] ?? null;
  }

  return parts.join(', ');
}
