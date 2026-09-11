import { ApiError, toApiError, toTransportError } from '../errors';

/**
 * La regla del contrato: el frontend decide segun el CODIGO, nunca parseando
 * el mensaje. Y hay dos formas de error en juego, porque el endpoint real no
 * cumple todavia el contrato.
 */
describe('toApiError · forma del contrato', () => {
  it('lee code, message y retryable anidados', () => {
    const error = toApiError(504, {
      error: { code: 'FILTER_TIMEOUT', message: 'Tardó demasiado.', retryable: true },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('FILTER_TIMEOUT');
    expect(error.message).toBe('Tardó demasiado.');
    expect(error.retryable).toBe(true);
    expect(error.status).toBe(504);
  });

  it('respeta retryable:false aunque el codigo sea reintentable por defecto', () => {
    const error = toApiError(500, {
      error: { code: 'INTERNAL', message: 'x', retryable: false },
    });
    expect(error.retryable).toBe(false);
  });
});

describe('toApiError · forma real del endpoint', () => {
  it('traduce URL_INVALIDA a INVALID_URL', () => {
    // Respuesta real observada del endpoint desplegado.
    const error = toApiError(400, {
      error: 'URL_INVALIDA',
      message: 'La URL no es válida o usa un esquema no soportado (solo http/https).',
    });

    expect(error.code).toBe('INVALID_URL');
    expect(error.retryable).toBe(false);
  });

  it('traduce INVALID_INPUT a INVALID_PAYLOAD', () => {
    const error = toApiError(400, {
      error: 'INVALID_INPUT',
      message: 'El campo "url" es requerido y debe ser un string.',
    });
    expect(error.code).toBe('INVALID_PAYLOAD');
    expect(error.retryable).toBe(false);
  });

  it('traduce INTERNAL_ERROR a INTERNAL y lo marca reintentable', () => {
    // Es lo que hoy devuelve el endpoint para CUALQUIER URL valida.
    const error = toApiError(500, {
      error: 'INTERNAL_ERROR',
      message: 'Error inesperado procesando la solicitud.',
    });

    expect(error.code).toBe('INTERNAL');
    expect(error.retryable).toBe(true);
  });
});

describe('toApiError · sin cuerpo util', () => {
  it('deduce el codigo del HTTP', () => {
    expect(toApiError(404, null).code).toBe('SCAN_NOT_FOUND');
    expect(toApiError(429, null).code).toBe('RATE_LIMITED');
    expect(toApiError(503, null).code).toBe('FILTER_UNAVAILABLE');
    expect(toApiError(504, null).code).toBe('FILTER_TIMEOUT');
    expect(toApiError(500, null).code).toBe('INTERNAL');
    expect(toApiError(418, null).code).toBe('UNKNOWN');
  });

  it('tolera HTML u otra basura en el cuerpo', () => {
    const error = toApiError(500, { message: '<html>502 Bad Gateway</html>' });
    expect(error.code).toBe('INTERNAL');
    expect(error.message).toContain('Bad Gateway');
  });

  it('da un mensaje por defecto si no hay ninguno', () => {
    expect(toApiError(500, {}).message).toContain('500');
  });

  it('ignora un codigo desconocido y cae al del HTTP', () => {
    expect(toApiError(503, { error: 'ALGO_RARO' }).code).toBe('FILTER_UNAVAILABLE');
  });

  it('ignora un codigo vacio y cae al del HTTP', () => {
    // Una cadena vacia no puede colarse como codigo: dejaria un ApiError con
    // code: "" que ninguna rama sabe interpretar.
    expect(toApiError(500, { error: '' }).code).toBe('INTERNAL');
    expect(toApiError(404, { error: { code: '' } }).code).toBe('SCAN_NOT_FOUND');
  });
});

describe('toTransportError', () => {
  it('distingue el corte por timeout', () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';

    const error = toTransportError(abort);
    expect(error.code).toBe('TIMEOUT');
    expect(error.retryable).toBe(true);
    expect(error.status).toBeNull();
  });

  it('trata el resto como falta de conexion', () => {
    const error = toTransportError(new TypeError('Network request failed'));
    expect(error.code).toBe('NETWORK');
    expect(error.retryable).toBe(true);
  });
});
