import { timeouts } from '../../api/config';
import { ApiError } from '../../api/errors';
import { analysisErrorMessage, remoteAnalysisService } from '../remoteAnalysisService';

/**
 * Un analisis que falla no inventa un veredicto: el servicio lanza ApiError y
 * la pantalla de carga avisa con un pop-up y vuelve al escaner.
 */
jest.mock('../../api/httpClient', () => ({ postJson: jest.fn() }));
// PhishTank no necesita clave y se consultaria de verdad: los tests no salen a
// la red. Su comportamiento se prueba en phishTank.test.ts.
jest.mock('../phishTank', () => ({
  lookupPhishTank: jest.fn(async () => ({ status: 'not_listed' })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { postJson } = require('../../api/httpClient') as { postJson: jest.Mock };

const URL = 'https://pagos-multas-gt.info/pago';

beforeEach(() => {
  postJson.mockReset();
});

describe('analyze · camino feliz', () => {
  it('adapta la respuesta real del endpoint', async () => {
    postJson.mockResolvedValue({
      url: URL,
      dominio: 'pagos-multas-gt.info',
      veredicto_final: 'SOSPECHOSO',
      filtro_decisivo: 'F2.2',
    });

    const result = await remoteAnalysisService.analyze(URL);

    expect(result.verdict).toBe('sospechoso');
    expect(result.domain).toBe('pagos-multas-gt.info');
  });

  it('una respuesta sin veredicto ni puntaje sube como INCONCLUSIVE', async () => {
    postJson.mockResolvedValue({
      url: URL,
      veredicto_final: 'PENDIENTE',
      filtro_decisivo: null,
      mensaje: 'F1 fue INCIERTO. F2.1 aún no implementado (S7).',
    });

    await expect(remoteAnalysisService.analyze(URL)).rejects.toMatchObject({
      code: 'INCONCLUSIVE',
    });
  });

  it('acota la espera con el presupuesto del analisis', async () => {
    // Se asierta el argumento porque es el unico sitio que lo fija.
    postJson.mockResolvedValue({ veredicto_final: 'SEGURO' });

    await remoteAnalysisService.analyze(URL);

    expect(postJson).toHaveBeenCalledWith(
      '/analyze',
      { url: URL, resultadoF1: 'INCIERTO' },
      { timeoutMs: expect.any(Number) },
    );
    const { timeoutMs } = postJson.mock.calls[0][2] as { timeoutMs: number };
    expect(timeoutMs).toBeGreaterThan(timeouts.analyze - 1_000);
    expect(timeoutMs).toBeLessThanOrEqual(timeouts.analyze);
  });

  /*
   * El contrato espera que el CLIENTE resuelva F1 y mande su conclusion: con
   * SEGURO o MALICIOSO el backend corta en ~5 s en vez de correr la cascada
   * completa. La app lo resuelve con sus listas locales (`localF1.ts`).
   */
  describe('resultadoF1', () => {
    it('manda INCIERTO para un dominio cualquiera: la app no sabe nada de el', async () => {
      postJson.mockResolvedValue({ veredicto_final: 'SOSPECHOSO' });

      await remoteAnalysisService.analyze('https://sitio-cualquiera-9281.com/x');

      expect(postJson).toHaveBeenCalledWith(
        '/analyze',
        expect.objectContaining({ resultadoF1: 'INCIERTO' }),
        expect.any(Object),
      );
    });

    it('manda SEGURO para un dominio de la lista local', async () => {
      postJson.mockResolvedValue({ veredicto_final: 'SEGURO' });

      await remoteAnalysisService.analyze('https://github.com/usuario/repo');

      expect(postJson).toHaveBeenCalledWith(
        '/analyze',
        expect.objectContaining({ resultadoF1: 'SEGURO' }),
        expect.any(Object),
      );
    });

    it('no marca seguro un dominio de la lista sin HTTPS', async () => {
      postJson.mockResolvedValue({ veredicto_final: 'SOSPECHOSO' });

      await remoteAnalysisService.analyze('http://github.com');

      expect(postJson).toHaveBeenCalledWith(
        '/analyze',
        expect.objectContaining({ resultadoF1: 'INCIERTO' }),
        expect.any(Object),
      );
    });
  });
});

describe('analyze · fallos', () => {
  const cases: [string, ApiError, string][] = [
    ['timeout', new ApiError('TIMEOUT', 'x', true, null), 'tardó demasiado'],
    ['sin red', new ApiError('NETWORK', 'x', true, null), 'verifica tu conexión a internet'],
    ['500 del servidor', new ApiError('INTERNAL', 'x', true, 500), 'no respondió correctamente'],
    ['limite de consultas', new ApiError('RATE_LIMITED', 'x', true, 429), 'límite de consultas'],
    // Cancelado tiene motivo propio: decirle "tardo demasiado" a quien salio
    // de la pantalla a proposito es describir un error que no ocurrio.
    ['cancelado por el usuario', new ApiError('CANCELLED', 'x', false, null), 'se canceló'],
    [
      'sin veredicto',
      new ApiError('INCONCLUSIVE', 'x', false, null),
      'no pudo concluir un veredicto',
    ],
  ];

  it.each(cases)('ante %s lanza el error con un aviso en lenguaje llano', async (_name, error, motivo) => {
    postJson.mockRejectedValue(error);

    await expect(remoteAnalysisService.analyze(URL)).rejects.toBe(error);
    expect(analysisErrorMessage(error)).toContain(motivo);
  });

  it('un 504 del servidor dice que tardo demasiado, no que respondio mal', async () => {
    // Respuesta real de API Gateway a los 35 s, medida el 2026-10-12.
    const error = new ApiError('FILTER_TIMEOUT', 'Endpoint request timed out', true, 504);
    postJson.mockRejectedValue(error);

    await expect(remoteAnalysisService.analyze(URL)).rejects.toBe(error);

    // Se reintento una vez y el segundo intento tambien dio 504.
    expect(postJson).toHaveBeenCalledTimes(2);
    expect(analysisErrorMessage(error)).toContain('tardó demasiado en analizar el enlace');
  });

  it.each([
    ['FILTER_UNAVAILABLE', 503],
    ['SCAN_NOT_FOUND', 404],
  ] as const)('ante %s usa el aviso generico', async (code, status) => {
    // Estos codigos caen en la rama por defecto: no hay copy util que dar
    // sobre un filtro interno que fallo, pero nunca quedan sin explicacion.
    const error = new ApiError(code, 'x', true, status);
    postJson.mockRejectedValue(error);

    await expect(remoteAnalysisService.analyze(URL)).rejects.toBe(error);
    expect(analysisErrorMessage(error)).toContain('no respondió correctamente');
  });

  it('un error inesperado que no es ApiError sube como UNKNOWN', async () => {
    postJson.mockRejectedValue(new Error('algo raro'));

    await expect(remoteAnalysisService.analyze(URL)).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

describe('analyze · URL invalida', () => {
  it('deja subir INVALID_URL en vez de degradar', async () => {
    // No es un fallo del analisis: el QR no llevaba un enlace analizable, y
    // esa decision es de la pantalla, no del servicio.
    postJson.mockRejectedValue(new ApiError('INVALID_URL', 'no válida', false, 400));

    await expect(remoteAnalysisService.analyze('no-es-url')).rejects.toMatchObject({
      code: 'INVALID_URL',
    });
  });
});

/*
 * Reintento tras un 504 de API Gateway. Medido el 2026-10-12: el segundo
 * intento de la misma URL puede completar (26.7-30.9 s) porque VirusTotal y
 * URLScan ya la analizaron. Ver la nota de `timeouts` en config.ts.
 */
describe('analyze · reintento tras un 504', () => {
  const gateway504 = () =>
    new ApiError('FILTER_TIMEOUT', 'Endpoint request timed out', true, 504);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('si el segundo intento responde, el analisis se completa', async () => {
    postJson
      .mockRejectedValueOnce(gateway504())
      .mockResolvedValueOnce({ veredicto_final: 'SOSPECHOSO', filtro_decisivo: 'F2.2' });

    const result = await remoteAnalysisService.analyze(URL);

    expect(postJson).toHaveBeenCalledTimes(2);
    expect(result.verdict).toBe('sospechoso');
    expect(result.degraded).toBeUndefined();
  });

  it('reintenta una sola vez', async () => {
    postJson.mockRejectedValue(gateway504());

    await expect(remoteAnalysisService.analyze(URL)).rejects.toBeInstanceOf(ApiError);

    expect(postJson).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['un 500', new ApiError('INTERNAL', 'x', true, 500)],
    ['sin red', new ApiError('NETWORK', 'x', true, null)],
    ['un 429', new ApiError('RATE_LIMITED', 'x', true, 429)],
    ['el tope propio de la app', new ApiError('TIMEOUT', 'x', true, null)],
  ])('no reintenta ante %s: insistir no lo arregla', async (_name, error) => {
    postJson.mockRejectedValue(error);

    await expect(remoteAnalysisService.analyze(URL)).rejects.toBe(error);

    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it('el segundo intento solo dispone de lo que queda del presupuesto', async () => {
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    postJson
      .mockImplementationOnce(async () => {
        now += 35_400; // lo que tarda el 504 de API Gateway
        throw gateway504();
      })
      .mockResolvedValueOnce({ veredicto_final: 'PENDIENTE', score_heuristico: 0 });

    await remoteAnalysisService.analyze(URL);

    const first = (postJson.mock.calls[0][2] as { timeoutMs: number }).timeoutMs;
    const second = (postJson.mock.calls[1][2] as { timeoutMs: number }).timeoutMs;
    expect(first).toBe(timeouts.analyze);
    expect(second).toBe(timeouts.analyze - 35_400);
  });

  it('no reintenta si no queda tiempo para que el reintento complete', async () => {
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    postJson.mockImplementationOnce(async () => {
      // Quedan menos de `analyzeRetryMinMs`.
      now += timeouts.analyze - timeouts.analyzeRetryMinMs + 1;
      throw gateway504();
    });

    await expect(remoteAnalysisService.analyze(URL)).rejects.toMatchObject({
      code: 'FILTER_TIMEOUT',
    });

    expect(postJson).toHaveBeenCalledTimes(1);
  });
});
