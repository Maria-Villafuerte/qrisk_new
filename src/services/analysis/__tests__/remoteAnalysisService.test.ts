import { timeouts } from '../../api/config';
import { ApiError } from '../../api/errors';
import { remoteAnalysisService } from '../remoteAnalysisService';
import type { AnalysisResult } from '../types';

/**
 * Degradacion elegante: es lo que separa una demo de un producto. Ante
 * cualquier fallo el usuario recibe un veredicto honesto, no una pantalla
 * rota ni una espera infinita.
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

/** El texto de la seccion de estructura, donde se explica un fallo del servidor. */
function heuristicsText(result: AnalysisResult): string {
  return result.sections.find((s) => s.key === 'heuristics')?.findings[0]?.text ?? '';
}

beforeEach(() => {
  postJson.mockReset();
});

describe('analyze · camino feliz', () => {
  it('adapta la respuesta real del endpoint', async () => {
    postJson.mockResolvedValue({
      url: URL,
      dominio: 'pagos-multas-gt.info',
      veredicto_final: 'PENDIENTE',
      filtro_decisivo: null,
      mensaje: 'F1 fue INCIERTO. F2.1 aún no implementado (S7).',
    });

    const result = await remoteAnalysisService.analyze(URL);

    expect(result.verdict).toBe('incierto');
    expect(result.domain).toBe('pagos-multas-gt.info');
    expect(result.degraded).toBe(true);
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
      postJson.mockResolvedValue({ veredicto_final: 'PENDIENTE' });

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
      postJson.mockResolvedValue({ veredicto_final: 'PENDIENTE' });

      await remoteAnalysisService.analyze('http://github.com');

      expect(postJson).toHaveBeenCalledWith(
        '/analyze',
        expect.objectContaining({ resultadoF1: 'INCIERTO' }),
        expect.any(Object),
      );
    });
  });
});

describe('analyze · degradacion', () => {
  const cases: [string, ApiError, string][] = [
    ['timeout', new ApiError('TIMEOUT', 'x', true, null), 'tardó demasiado'],
    ['sin red', new ApiError('NETWORK', 'x', true, null), 'No hubo conexión'],
    ['500 del servidor', new ApiError('INTERNAL', 'x', true, 500), 'no respondió correctamente'],
    ['limite de consultas', new ApiError('RATE_LIMITED', 'x', true, 429), 'límite de consultas'],
    // Cancelado tiene motivo propio: decirle "tardo demasiado" a quien salio
    // de la pantalla a proposito es describir un error que no ocurrio.
    ['cancelado por el usuario', new ApiError('CANCELLED', 'x', false, null), 'se canceló'],
  ];

  it.each(cases)('ante %s devuelve un incierto honesto', async (_name, error, motivo) => {
    postJson.mockRejectedValue(error);

    const result = await remoteAnalysisService.analyze(URL);

    expect(result.verdict).toBe('incierto');
    expect(result.degraded).toBe(true);
    expect(result.domain).toBe('pagos-multas-gt.info');
    // El motivo se explica en las secciones del servidor, en lenguaje llano.
    expect(heuristicsText(result)).toContain(motivo);
  });

  it('la seccion de reputacion cuenta lo que F1 consulto aunque el servidor falle', async () => {
    postJson.mockRejectedValue(new ApiError('TIMEOUT', 'x', true, null));

    const result = await remoteAnalysisService.analyze(URL);
    const reputation = result.sections.find((s) => s.key === 'reputation');

    // F1 corre en el telefono: su resultado no depende del servidor, asi que
    // no se rellena con el motivo del fallo.
    expect(reputation?.findings[0].text).toContain('Google Safe Browsing');
    expect(reputation?.findings[0].text).not.toContain('tardó demasiado');
  });

  it('nunca devuelve "seguro" cuando el analisis fallo', async () => {
    postJson.mockRejectedValue(new ApiError('INTERNAL', 'x', true, 500));
    const result = await remoteAnalysisService.analyze(URL);
    expect(result.verdict).not.toBe('seguro');
  });

  it('un 504 del servidor dice que tardo demasiado, no que respondio mal', async () => {
    // Respuesta real de API Gateway a los 35 s, medida el 2026-10-12.
    postJson.mockRejectedValue(new ApiError('FILTER_TIMEOUT', 'Endpoint request timed out', true, 504));

    const result = await remoteAnalysisService.analyze(URL);

    // Se reintento una vez y el segundo intento tambien dio 504.
    expect(postJson).toHaveBeenCalledTimes(2);
    expect(result.verdict).toBe('incierto');
    expect(heuristicsText(result)).toContain('tardó demasiado en analizar el enlace');
    expect(heuristicsText(result)).not.toContain('no respondió correctamente');
  });

  it.each([
    ['FILTER_UNAVAILABLE', 503],
    ['SCAN_NOT_FOUND', 404],
  ] as const)('degrada honestamente ante %s, sin mensaje especifico', async (code, status) => {
    // Estos codigos caen en la rama por defecto de `reasonFor`: el usuario ve
    // un motivo generico. Es deliberado —no hay copy util que darle sobre un
    // filtro interno que fallo— pero tiene que seguir degradando a "incierto"
    // y nunca quedarse sin explicacion.
    postJson.mockRejectedValue(new ApiError(code, 'x', true, status));

    const result = await remoteAnalysisService.analyze(URL);

    expect(result.verdict).toBe('incierto');
    expect(result.degraded).toBe(true);
    expect(heuristicsText(result)).toContain('no respondió correctamente');
  });

  it('degrada tambien ante un error inesperado que no es ApiError', async () => {
    postJson.mockRejectedValue(new Error('algo raro'));

    const result = await remoteAnalysisService.analyze(URL);
    expect(result.verdict).toBe('incierto');
    expect(result.degraded).toBe(true);
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

    await remoteAnalysisService.analyze(URL);

    expect(postJson).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['un 500', new ApiError('INTERNAL', 'x', true, 500)],
    ['sin red', new ApiError('NETWORK', 'x', true, null)],
    ['un 429', new ApiError('RATE_LIMITED', 'x', true, 429)],
    ['el tope propio de la app', new ApiError('TIMEOUT', 'x', true, null)],
  ])('no reintenta ante %s: insistir no lo arregla', async (_name, error) => {
    postJson.mockRejectedValue(error);

    await remoteAnalysisService.analyze(URL);

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

    const result = await remoteAnalysisService.analyze(URL);

    expect(postJson).toHaveBeenCalledTimes(1);
    expect(result.verdict).toBe('incierto');
  });
});
