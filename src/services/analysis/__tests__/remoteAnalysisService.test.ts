import { timeouts } from '../../api/config';
import { ApiError } from '../../api/errors';
import { remoteAnalysisService } from '../remoteAnalysisService';

/**
 * Degradacion elegante: es lo que separa una demo de un producto. Ante
 * cualquier fallo el usuario recibe un veredicto honesto, no una pantalla
 * rota ni una espera infinita.
 */
jest.mock('../../api/httpClient', () => ({ postJson: jest.fn() }));

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
      veredicto_final: 'PENDIENTE',
      filtro_decisivo: null,
      mensaje: 'F1 fue INCIERTO. F2.1 aún no implementado (S7).',
    });

    const result = await remoteAnalysisService.analyze(URL);

    expect(result.verdict).toBe('incierto');
    expect(result.domain).toBe('pagos-multas-gt.info');
    expect(result.degraded).toBe(true);
  });

  it('corta la espera en el tope configurado', async () => {
    // El endpoint real se cuelga ~16 s antes de fallar. El corte de 5 s es lo
    // unico que evita que el usuario mire la pantalla de carga todo ese rato,
    // asi que se asierta el argumento: sin esto, subir el timeout a 60 s
    // pasaria todos los demas tests sin que nadie se entere.
    postJson.mockResolvedValue({ veredicto_final: 'SEGURO' });

    await remoteAnalysisService.analyze(URL);

    expect(postJson).toHaveBeenCalledWith(
      '/analyze',
      { url: URL },
      { timeoutMs: timeouts.analyze },
    );
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
    // El motivo se explica en las secciones, en lenguaje llano.
    expect(result.sections[0].findings[0].text).toContain(motivo);
  });

  it('nunca devuelve "seguro" cuando el analisis fallo', async () => {
    postJson.mockRejectedValue(new ApiError('INTERNAL', 'x', true, 500));
    const result = await remoteAnalysisService.analyze(URL);
    expect(result.verdict).not.toBe('seguro');
  });

  it.each([
    ['FILTER_TIMEOUT', 504],
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
    expect(result.sections[0].findings[0].text).toContain('no respondió correctamente');
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
