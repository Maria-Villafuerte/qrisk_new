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
});

describe('analyze · degradacion', () => {
  const cases: [string, ApiError, string][] = [
    ['timeout', new ApiError('TIMEOUT', 'x', true, null), 'tardó demasiado'],
    ['sin red', new ApiError('NETWORK', 'x', true, null), 'No hubo conexión'],
    ['500 del servidor', new ApiError('INTERNAL', 'x', true, 500), 'no respondió correctamente'],
    ['limite de consultas', new ApiError('RATE_LIMITED', 'x', true, 429), 'límite de consultas'],
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

describe('getHistory', () => {
  it('lee del dispositivo, no del servidor', async () => {
    // El historial es local por diseno: la metrica pide que sea 100%
    // recuperable sin conexion.
    await expect(remoteAnalysisService.getHistory()).resolves.toEqual([]);
    expect(postJson).not.toHaveBeenCalled();
  });
});
