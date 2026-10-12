import { ApiError } from '../api/errors';
import type { F1Verdict } from './localF1';

/**
 * Filtro F1 — consulta a Google Safe Browsing.
 *
 * QUE ES Y POR QUE ESTA EN EL FRONTEND. El protocolo del trabajo define el
 * Filtro F1 como la consulta a listas de reputacion (Google Safe Browsing,
 * PhishTank y VirusTotal) y lo asigna al modulo frontend como Objetivo
 * Especifico 4, con tiempo de respuesta objetivo < 5 s. El backend implementa
 * el CORTE de la cascada —acepta `resultadoF1` y responde de inmediato cuando
 * vale SEGURO o MALICIOSO— pero no las listas: espera que el cliente las
 * consulte.
 *
 * LAS TRES APIS DEL PROTOCOLO, Y DONDE VIVE CADA UNA:
 *
 *   - Google Safe Browsing (este archivo): endpoint `threatMatches:find`,
 *     pensado para consulta puntual desde un cliente, con 10.000
 *     consultas/dia en el plan gratuito.
 *   - PhishTank (`phishTank.ts`): endpoint `checkurl`, consulta por URL
 *     individual, sin clave obligatoria. Se consulta en paralelo con esta.
 *   - VirusTotal: ya se consulta en F2.2, del lado del backend. Volver a
 *     consultarla aqui duplicaria la llamada y gastaria dos veces la cuota
 *     (500/dia, 4/min), que es la mas estrecha de las tres.
 *
 * Las tres fuentes del protocolo participan del sistema, cada una en la capa
 * donde es viable.
 *
 * COMO SE COMPORTA SIN CLAVE. Si no hay clave configurada, `checkSafeBrowsing`
 * devuelve INCIERTO sin hacer ninguna llamada. La app sigue funcionando y la
 * cascada decide como antes: la ausencia de credencial NO puede romper el
 * analisis ni, mucho menos, producir un falso SEGURO.
 */

/** Respuesta de `threatMatches:find`. Vacia (`{}`) cuando no hay coincidencias. */
interface ThreatMatchesResponse {
  matches?: {
    threatType?: string;
    platformType?: string;
    threat?: { url?: string };
  }[];
}

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

/**
 * Tope de la consulta.
 *
 * El protocolo fija T_F1 <= 5 s (p90) y el plan de mitigacion de riesgos (R2)
 * habla de un timeout por API de 4 s. Se usan 4 s: si Safe Browsing no
 * respondio en ese tiempo, se sigue sin su opinion en vez de hacer esperar a
 * la persona. Es la "degradacion elegante ante fallo parcial de APIs" que el
 * protocolo pide.
 */
export const SAFE_BROWSING_TIMEOUT_MS = 4_000;

/**
 * La clave de la API.
 *
 * Viaja como variable de entorno `EXPO_PUBLIC_SAFE_BROWSING_KEY`, que Expo
 * inyecta en el bundle al compilar.
 *
 * SOBRE QUE QUEDE EN EL BUNDLE: una clave `EXPO_PUBLIC_*` es legible por
 * cualquiera que desempaquete el APK, asi que NO es un secreto. Para Safe
 * Browsing es aceptable porque la clave solo permite consultar listas publicas
 * y su unico riesgo es el consumo de cuota; se restringe por aplicacion en la
 * consola de Google Cloud. Una clave con la que se pudiera escribir, cobrar o
 * leer datos de usuarios NO podria ir aqui: tendria que vivir en el backend.
 */
function apiKey(): string {
  return (process.env.EXPO_PUBLIC_SAFE_BROWSING_KEY ?? '').trim();
}

/** Si esta version puede consultar F1 de verdad. */
export function isSafeBrowsingConfigured(): boolean {
  return apiKey().length > 0;
}

/**
 * Tipos de amenaza que se consultan.
 *
 * MALWARE y SOCIAL_ENGINEERING son los relevantes para quishing: el segundo es
 * el que cubre phishing. Los otros dos que ofrece la API
 * (UNWANTED_SOFTWARE, POTENTIALLY_HARMFUL_APPLICATION) describen software, no
 * paginas, y no aportan a este caso.
 */
const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING'] as const;

/**
 * Lo que paso en la consulta, con el detalle que la pantalla necesita.
 *
 * `checkSafeBrowsing` lo reduce a un veredicto, que es lo unico que necesita la
 * cascada. Pero para EXPLICAR el veredicto hace falta distinguir tres cosas que
 * el veredicto colapsa en el mismo INCIERTO:
 *
 *   - 'not_listed': se consulto y Google no la tiene reportada.
 *   - 'unavailable': se intento y no hubo respuesta util (timeout, red, cuota).
 *   - 'not_configured': esta version no tiene clave, no se consulto.
 *
 * Decirle a la persona "Google no la tiene reportada" cuando en realidad no se
 * pudo consultar seria afirmar algo que no se verifico.
 */
export type SafeBrowsingStatus = 'listed' | 'not_listed' | 'unavailable' | 'not_configured';

export interface SafeBrowsingLookup {
  status: SafeBrowsingStatus;
  /**
   * Tipo de amenaza de la primera coincidencia ("SOCIAL_ENGINEERING",
   * "MALWARE"). Solo cuando `status` es 'listed' y Google lo informa.
   */
  threatType?: string;
}

/**
 * Consulta Safe Browsing y devuelve el detalle de la consulta.
 *
 * No lanza nunca: un fallo de red o una cuota agotada no pueden impedir el
 * analisis. Ver `checkSafeBrowsing` para por que la ausencia en la lista nunca
 * se traduce en SEGURO.
 */
export async function lookupSafeBrowsing(url: string): Promise<SafeBrowsingLookup> {
  const key = apiKey();
  if (!key) return { status: 'not_configured' };

  const trimmed = url.trim();
  if (!trimmed) return { status: 'unavailable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SAFE_BROWSING_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        client: { clientId: 'qrisk', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: THREAT_TYPES,
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: trimmed }],
        },
      }),
    });

    if (!response.ok) return { status: 'unavailable' };

    const data = (await response.json()) as ThreatMatchesResponse;
    if (!Array.isArray(data.matches) || data.matches.length === 0) {
      return { status: 'not_listed' };
    }
    const threatType = data.matches[0]?.threatType;
    return typeof threatType === 'string' && threatType
      ? { status: 'listed', threatType }
      : { status: 'listed' };
  } catch (cause) {
    // Aborto por timeout, sin red, JSON invalido: la consulta no se pudo
    // hacer. La cascada se encarga. Se traga a proposito, incluido un ApiError.
    void (cause instanceof ApiError);
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta Safe Browsing por una URL.
 *
 * Devuelve:
 *   - MALICIOSO si la URL coincide con alguna lista de amenazas.
 *   - INCIERTO si no coincide, si no hay clave, o si la consulta fallo.
 *
 * NUNCA DEVUELVE SEGURO, y es deliberado. Que Safe Browsing no conozca una URL
 * no significa que sea segura: significa que no esta en sus listas. La mayoria
 * de los sitios de phishing son nuevos y no han sido reportados todavia, asi
 * que tratar "no esta en la lista" como "es seguro" seria justo el error que
 * produce un falso SEGURO —el peor resultado posible de este producto—. Ante la
 * ausencia de informacion, la cascada sigue a F2.1 y F2.2.
 *
 * No lanza nunca: un fallo de red o una cuota agotada no pueden impedir el
 * analisis.
 */
export async function checkSafeBrowsing(url: string): Promise<F1Verdict> {
  const lookup = await lookupSafeBrowsing(url);
  return lookup.status === 'listed' ? 'MALICIOSO' : 'INCIERTO';
}
