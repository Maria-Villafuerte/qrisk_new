import type { F1Verdict } from './localF1';

/**
 * Filtro F1 — consulta a PhishTank.
 *
 * QUE APORTA FRENTE A SAFE BROWSING. PhishTank es una base colaborativa: una
 * persona reporta una URL, la comunidad vota, y la URL confirmada entra a la
 * base en minutos. Safe Browsing se alimenta de un analisis automatico de
 * Google y tarda mas en indexar campañas nuevas. Medido el 2026-10-12: dos
 * phishing verificados en PhishTank 40 minutos antes
 * (`registro-cita-digital-aythn-2026.cr-web.workers.dev`,
 * `allegrolokalnie.078259.top`) que Safe Browsing todavia no conocia.
 * Es la cobertura complementaria que el protocolo le pide a F1.
 *
 * EL CAMPO QUE DECIDE ES `valid`, NO `in_database`. Medido el mismo dia:
 * `https://github.com` responde `in_database: true, verified: true,
 * valid: false`. Es un reporte que la comunidad reviso y DESCARTO. Si
 * "esta en la base" se tradujera en MALICIOSO, GitHub saldria malicioso.
 * Solo un reporte verificado Y vigente (`verified && valid`) es una amenaza
 * confirmada.
 *
 * SOBRE LA CLAVE. `EXPO_PUBLIC_PHISHTANK_KEY` es OPCIONAL: sin ella la API
 * responde igual, con un limite de 250 consultas cada 5 minutos por IP
 * (cabecera `X-Request-Limit`, medida el 2026-10-12), que para un telefono
 * sobra. Como no hace falta, no hay ningun secreto que meter en el APK. Si se
 * configura, solo sube el limite.
 *
 * Igual que con Safe Browsing, la URL escaneada se envia a un tercero. Es la
 * consulta que el protocolo define para F1, y la app no manda nada mas.
 */

const ENDPOINT = 'https://checkurl.phishtank.com/checkurl/';

/**
 * PhishTank pide que el cliente se identifique en el User-Agent con el formato
 * `phishtank/<usuario>`, y puede bloquear clientes anonimos.
 */
const USER_AGENT = 'phishtank/qrisk';

/**
 * Tope de la consulta. El mismo que Safe Browsing (riesgo R2 del protocolo:
 * timeout por API de 4 s). Como las dos se consultan en paralelo, T_F1 queda
 * acotado por el tope, no por la suma.
 */
export const PHISHTANK_TIMEOUT_MS = 4_000;

/** Clave opcional. Vacia = consulta anonima, que tambien funciona. */
function appKey(): string {
  return (process.env.EXPO_PUBLIC_PHISHTANK_KEY ?? '').trim();
}

/**
 * Lo que paso en la consulta.
 *
 *   - 'listed': phishing verificado y vigente en PhishTank.
 *   - 'not_listed': PhishTank respondio y no la tiene confirmada. Incluye las
 *     URLs que estan en la base con un reporte descartado (`valid: false`).
 *   - 'unavailable': no hubo respuesta util (timeout, red, limite, formato).
 */
export type PhishTankStatus = 'listed' | 'not_listed' | 'unavailable';

export interface PhishTankLookup {
  status: PhishTankStatus;
  /** Identificador del reporte en PhishTank, cuando esta 'listed'. */
  phishId?: number;
}

/** Respuesta de `checkurl` con `format=json`. */
interface CheckUrlResponse {
  meta?: { status?: string };
  results?: {
    in_database?: unknown;
    verified?: unknown;
    valid?: unknown;
    phish_id?: unknown;
  };
}

/**
 * La API historicamente ha mandado los booleanos como `true` y tambien como
 * texto ("true", "y"). Se aceptan las dos formas; cualquier otra cosa es falso,
 * que es el lado seguro: ante la duda no se condena.
 */
function isTrue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  return text === 'true' || text === 'y' || text === 'yes';
}

/** Cuerpo `application/x-www-form-urlencoded`, armado a mano. */
function formBody(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Consulta PhishTank y devuelve el detalle de la consulta.
 *
 * No lanza nunca: un fallo de red o el limite de consultas no pueden impedir
 * el analisis.
 */
export async function lookupPhishTank(url: string): Promise<PhishTankLookup> {
  const trimmed = url.trim();
  if (!trimmed) return { status: 'unavailable' };

  const fields: Record<string, string> = { url: trimmed, format: 'json' };
  const key = appKey();
  if (key) fields.app_key = key;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHISHTANK_TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
      body: formBody(fields),
    });

    if (!response.ok) return { status: 'unavailable' };

    const data = (await response.json()) as CheckUrlResponse;
    const results = data?.results;
    // Sin `results` la respuesta no dice nada sobre la URL: puede ser un
    // error de la API con HTTP 200. No se puede afirmar "no reportada".
    if (!results || typeof results !== 'object') return { status: 'unavailable' };

    const confirmed =
      isTrue(results.in_database) && isTrue(results.verified) && isTrue(results.valid);
    if (!confirmed) return { status: 'not_listed' };

    const phishId = Number(results.phish_id);
    return Number.isSafeInteger(phishId) && phishId > 0
      ? { status: 'listed', phishId }
      : { status: 'listed' };
  } catch {
    // Aborto por timeout, sin red, JSON invalido: la consulta no se pudo
    // hacer. La cascada se encarga.
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta PhishTank por una URL.
 *
 * Devuelve MALICIOSO si es un phishing verificado y vigente; INCIERTO en
 * cualquier otro caso. NUNCA SEGURO, por la misma razon que Safe Browsing: que
 * una URL no este en la lista no prueba que sea segura, solo que nadie la ha
 * reportado todavia.
 */
export async function checkPhishTank(url: string): Promise<F1Verdict> {
  const lookup = await lookupPhishTank(url);
  return lookup.status === 'listed' ? 'MALICIOSO' : 'INCIERTO';
}
