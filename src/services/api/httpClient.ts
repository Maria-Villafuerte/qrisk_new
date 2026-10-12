import { apiBaseUrl } from './config';
import { ApiError, toApiError, toTransportError } from './errors';

/**
 * Cliente HTTP minimo. No usa librerias: `fetch` ya viene en React Native, y
 * el corte por tiempo (cuando se pide) se resuelve con AbortController.
 */

interface PostOptions {
  /**
   * Milisegundos antes de abortar. Sin el, la peticion espera lo que tarde el
   * servidor (hoy, POST /analyze: ver la nota de `timeouts` en config.ts).
   */
  timeoutMs?: number;
  /** Permite cancelar desde afuera (por ejemplo, al salir de la pantalla). */
  signal?: AbortSignal;
}

/**
 * POST con JSON de ida y vuelta. Lanza ApiError siempre: quien llama nunca ve
 * un error de fetch crudo ni un cuerpo a medio parsear.
 */
export async function postJson<T>(path: string, body: unknown, options: PostOptions): Promise<T> {
  const controller = new AbortController();
  const timer =
    options.timeoutMs === undefined
      ? undefined
      : setTimeout(() => controller.abort(), options.timeoutMs);

  // Quien aborto. `AbortController` marca las dos razones con el mismo
  // `AbortError`, asi que sin esta bandera una cancelacion del llamador se
  // reportaba como TIMEOUT: un error que no ocurrio, y encima reintentable.
  let cancelledByCaller = false;

  // Si el llamador cancela, se corta igual.
  const onExternalAbort = () => {
    cancelledByCaller = true;
    controller.abort();
  };
  options.signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await readJson(response);

    if (!response.ok) {
      throw toApiError(response.status, payload);
    }

    return payload as T;
  } catch (cause) {
    // Los ApiError ya vienen traducidos; el resto es fallo de transporte.
    if (cause instanceof ApiError) throw cause;
    throw toTransportError(cause, cancelledByCaller);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Lee el cuerpo como JSON sin reventar si no lo es: un 500 de API Gateway
 * puede devolver HTML, y eso no puede tumbar la traduccion del error.
 */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
