/**
 * Traduccion de errores de red a algo que la app pueda decidir.
 *
 * La regla del contrato: el frontend decide segun el CODIGO, nunca parseando
 * el mensaje. Hay que soportar dos formas porque no coinciden:
 *
 *   contrato:  { "error": { "code": "...", "message": "...", "retryable": true } }
 *   endpoint:  { "error": "INTERNAL_ERROR", "message": "..." }
 */

/** Codigos que la app sabe interpretar. */
export type ApiErrorCode =
  | 'INVALID_URL'
  | 'INVALID_PAYLOAD'
  | 'SCAN_NOT_FOUND'
  | 'FILTER_TIMEOUT'
  | 'FILTER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'NETWORK'
  | 'TIMEOUT'
  /** El llamador cancelo la peticion a proposito (salio de la pantalla). */
  | 'CANCELLED'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(code: ApiErrorCode, message: string, retryable: boolean, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

/**
 * Nombres que usa el endpoint real para los mismos casos del contrato. Se
 * mapean aqui para que el resto de la app conozca un solo vocabulario.
 */
const CODE_ALIASES: Record<string, ApiErrorCode> = {
  URL_INVALIDA: 'INVALID_URL',
  INVALID_INPUT: 'INVALID_PAYLOAD',
  INTERNAL_ERROR: 'INTERNAL',
  INVALID_URL: 'INVALID_URL',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  SCAN_NOT_FOUND: 'SCAN_NOT_FOUND',
  FILTER_TIMEOUT: 'FILTER_TIMEOUT',
  FILTER_UNAVAILABLE: 'FILTER_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
};

/** Que codigo corresponde a un HTTP cuando el cuerpo no trae uno util. */
function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400) return 'INVALID_PAYLOAD';
  if (status === 404) return 'SCAN_NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'FILTER_UNAVAILABLE';
  if (status === 504) return 'FILTER_TIMEOUT';
  if (status >= 500) return 'INTERNAL';
  return 'UNKNOWN';
}

/**
 * Si conviene reintentar. Un 4xx es culpa de la peticion: reintentarlo da el
 * mismo resultado y solo hace esperar mas al usuario.
 */
function isRetryable(code: ApiErrorCode): boolean {
  // 'CANCELLED' no esta aqui a proposito: si la persona salio de la pantalla,
  // reintentar seria traer una respuesta que ya nadie espera.
  return (
    code === 'FILTER_TIMEOUT' ||
    code === 'FILTER_UNAVAILABLE' ||
    code === 'RATE_LIMITED' ||
    code === 'INTERNAL' ||
    code === 'NETWORK' ||
    code === 'TIMEOUT'
  );
}

/** Lee el codigo del cuerpo, en cualquiera de las dos formas. */
function extractCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const error = (body as { error?: unknown }).error;

  // Forma del endpoint real: error es una cadena.
  if (typeof error === 'string') return error;

  // Forma del contrato: error es un objeto con code.
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }

  return null;
}

/** Lee el mensaje legible, en cualquiera de las dos formas. */
function extractMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;

  const top = (body as { message?: unknown }).message;
  if (typeof top === 'string' && top) return top;

  const error = (body as { error?: unknown }).error;
  if (typeof error === 'object' && error !== null) {
    const nested = (error as { message?: unknown }).message;
    if (typeof nested === 'string' && nested) return nested;
  }

  return null;
}

/** Si el cuerpo declara explicitamente que se puede reintentar. */
function extractRetryable(body: unknown): boolean | null {
  if (typeof body !== 'object' || body === null) return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error === 'object' && error !== null) {
    const retryable = (error as { retryable?: unknown }).retryable;
    if (typeof retryable === 'boolean') return retryable;
  }
  return null;
}

/** Convierte una respuesta HTTP fallida en un ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  const raw = extractCode(body);
  // Ojo: `raw && ...` devuelve "" con una cadena vacia, y `??` no lo atrapa
  // porque solo cubre null/undefined. De ahi el ternario explicito.
  const mapped = raw ? CODE_ALIASES[raw.toUpperCase()] : undefined;
  const code: ApiErrorCode = mapped ?? codeFromStatus(status);
  const message = extractMessage(body) ?? `La solicitud fallo (HTTP ${status}).`;
  const retryable = extractRetryable(body) ?? isRetryable(code);

  return new ApiError(code, message, retryable, status);
}

/**
 * Convierte un fallo de transporte (sin respuesta) en un ApiError.
 *
 * `cancelled` distingue las DOS razones por las que se aborta una peticion, que
 * `AbortController` marca igual (`AbortError`) y no son lo mismo: que se acabo
 * el tiempo, o que el llamador ya no quiere la respuesta. Confundirlas hacia
 * que al salir de la pantalla se reportara "El analisis tardo demasiado", un
 * error que no ocurrio y que ademas se marca reintentable.
 */
export function toTransportError(cause: unknown, cancelled = false): ApiError {
  if (cause instanceof Error && cause.name === 'AbortError') {
    return cancelled
      ? new ApiError('CANCELLED', 'El análisis se canceló.', false, null)
      : new ApiError('TIMEOUT', 'El análisis tardó demasiado.', true, null);
  }

  return new ApiError('NETWORK', 'No hay conexión con el servidor.', true, null);
}
