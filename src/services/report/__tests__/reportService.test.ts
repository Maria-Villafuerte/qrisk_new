import { timeouts } from '../../api/config';
import { ApiError } from '../../api/errors';
import type { AnalysisResult } from '../../analysis/types';
import {
  buildReportPayload,
  COMMENT_MAX,
  PLACE_MAX,
  submitReport,
  validateReport,
} from '../reportService';

jest.mock('../../api/httpClient', () => ({ postJson: jest.fn() }));
const { postJson } = require('../../api/httpClient') as { postJson: jest.Mock };

const result: AnalysisResult = {
  verdict: 'sospechoso',
  domain: 'pagos-multas-gt.info',
  url: 'https://pagos-multas-gt.info/pago',
  summary: 'Señales de riesgo.',
  riskScore: 68,
  sections: [],
};

beforeEach(() => {
  postJson.mockReset();
  postJson.mockResolvedValue({ reporte_id: 1, recibido_en: '2026-10-11T19:00:00.000Z' });
});

describe('validateReport', () => {
  it('acepta los dos campos vacios: son opcionales', () => {
    expect(validateReport({ comment: '', place: '' })).toEqual({});
  });

  it('acepta contenido normal', () => {
    expect(validateReport({ comment: 'Estaba pegado encima', place: 'Plaza Sol' })).toEqual({});
  });

  it('rechaza un comentario demasiado largo', () => {
    const errors = validateReport({ comment: 'x'.repeat(COMMENT_MAX + 1), place: '' });
    expect(errors.comment).toContain(String(COMMENT_MAX));
    expect(errors.place).toBeUndefined();
  });

  it('rechaza un lugar demasiado largo', () => {
    const errors = validateReport({ comment: '', place: 'x'.repeat(PLACE_MAX + 1) });
    expect(errors.place).toContain(String(PLACE_MAX));
  });

  it('acepta justo en el limite', () => {
    expect(
      validateReport({ comment: 'x'.repeat(COMMENT_MAX), place: 'x'.repeat(PLACE_MAX) }),
    ).toEqual({});
  });
});

/*
 * El payload cambio el 2026-10-11 para alinearse con `POST /report`, que es el
 * endpoint que el backend entrego (antes se enviaba a `/reports`, en plural, un
 * endpoint que nunca existio). El contrato acepta exactamente tres campos:
 * `url`, `motivo` y `analisis_id`.
 */
describe('buildReportPayload', () => {
  it('manda la url, que es el unico campo obligatorio', () => {
    const payload = buildReportPayload(result, { comment: '', place: '' });
    expect(payload.url).toBe('https://pagos-multas-gt.info/pago');
  });

  it('solo manda los campos del contrato', () => {
    const payload = buildReportPayload(result, { comment: 'hola', place: 'ahi' });
    expect(Object.keys(payload).sort()).toEqual(['motivo', 'url']);
  });

  it('omite motivo cuando no hay nada escrito', () => {
    expect(buildReportPayload(result, { comment: '   ', place: '' })).not.toHaveProperty('motivo');
  });

  it('usa el comentario como motivo', () => {
    const payload = buildReportPayload(result, { comment: '  Pedia mi PIN  ', place: '' });
    expect(payload.motivo).toBe('Pedia mi PIN');
  });

  it('conserva el lugar, etiquetado, porque el contrato tiene un solo campo', () => {
    const payload = buildReportPayload(result, { comment: 'Pedia mi PIN', place: 'Zona 10' });
    expect(payload.motivo).toBe('Pedia mi PIN\nLugar: Zona 10');
  });

  it('manda el lugar aunque no haya comentario: es la respuesta de la persona', () => {
    const payload = buildReportPayload(result, { comment: '', place: 'Zona 10' });
    expect(payload.motivo).toBe('Lugar: Zona 10');
  });

  describe('analisis_id', () => {
    it('no viaja cuando el analisis no trae scanId', () => {
      expect(buildReportPayload(result, { comment: '', place: '' })).not.toHaveProperty(
        'analisis_id',
      );
    });

    it('viaja como entero cuando el scanId es numerico', () => {
      const payload = buildReportPayload({ ...result, scanId: '42' }, { comment: '', place: '' });
      expect(payload.analisis_id).toBe(42);
    });

    /*
     * El contrato responde 400 si el `analisis_id` no corresponde a un analisis
     * real, asi que un scanId que no sea un entero limpio se omite en vez de
     * hacer fallar un reporte que por lo demas es valido.
     */
    it('se omite si el scanId no es un entero', () => {
      for (const scanId of ['scn_8f2a91c4', '12.5', '-3', '0', 'abc', '1e3', '']) {
        const payload = buildReportPayload({ ...result, scanId }, { comment: '', place: '' });
        expect(payload).not.toHaveProperty('analisis_id');
      }
    });
  });

  it('es anonimo: no lleva identificador de usuario ni coordenadas', () => {
    const payload = buildReportPayload(result, { comment: 'x', place: 'y' });
    const keys = Object.keys(payload);

    expect(keys).not.toContain('userId');
    expect(keys).not.toContain('deviceId');
    expect(keys).not.toContain('latitude');
    expect(keys).not.toContain('longitude');
    // Tampoco la hora local, que delataria la zona horaria de la persona.
    expect(keys).not.toContain('reportedAt');
  });
});

describe('submitReport', () => {
  it('devuelve ok cuando el envio funciona', async () => {
    await expect(submitReport(result, { comment: 'hola', place: '' })).resolves.toEqual({
      ok: true,
    });
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it('va a /report, el endpoint del contrato', async () => {
    await submitReport(result, { comment: 'hola', place: '' });

    expect(postJson).toHaveBeenCalledWith('/report', expect.any(Object), {
      timeoutMs: timeouts.report,
    });
  });

  /*
   * El reporte no consulta APIs externas y responde en ~5 s, asi que usa su
   * propio tope y no el presupuesto del analisis (40 s): hacer esperar 40 s por
   * un formulario que ya fallo no aporta nada.
   */
  it('usa un tope mas corto que el del analisis', () => {
    expect(timeouts.report).toBeLessThan(timeouts.analyze);
  });

  it('no lanza ante un fallo de red: devuelve el motivo', async () => {
    postJson.mockRejectedValue(new ApiError('NETWORK', 'x', true, null));

    const outcome = await submitReport(result, { comment: 'hola', place: '' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.retryable).toBe(true);
      expect(outcome.message).toContain('conexión');
    }
  });

  /*
   * Verificado el 2026-10-11: `/report` valida bien pero el guardado responde
   * 500 de forma consistente. Decirle a la persona que revise su conexion
   * cuando el problema es del servidor la manda a arreglar algo que no esta
   * roto, asi que ese caso tiene su propio mensaje.
   */
  it('distingue el fallo del servidor del fallo de conexion', async () => {
    postJson.mockRejectedValue(new ApiError('INTERNAL', 'x', true, 500));

    const outcome = await submitReport(result, { comment: '', place: '' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.message).toContain('servidor');
      expect(outcome.message).not.toContain('Revisa tu conexión');
    }
  });

  it('marca como no reintentable un rechazo del servidor', async () => {
    postJson.mockRejectedValue(new ApiError('INVALID_PAYLOAD', 'x', false, 400));

    const outcome = await submitReport(result, { comment: '', place: '' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.retryable).toBe(false);
  });

  it('invita a reintentar cuando el servidor tardo demasiado', async () => {
    postJson.mockRejectedValue(new ApiError('TIMEOUT', 'x', true, null));

    const outcome = await submitReport(result, { comment: '', place: '' });
    if (!outcome.ok) {
      expect(outcome.message).toContain('tardó demasiado');
      expect(outcome.retryable).toBe(true);
    }
  });

  it('pide esperar cuando se alcanzo el limite de envios', async () => {
    postJson.mockRejectedValue(new ApiError('RATE_LIMITED', 'x', true, 429));

    const outcome = await submitReport(result, { comment: '', place: '' });
    if (!outcome.ok) expect(outcome.message).toContain('límite');
  });

  it('avisa cuando el servidor rechaza los datos', async () => {
    postJson.mockRejectedValue(new ApiError('INVALID_PAYLOAD', 'x', false, 400));

    const outcome = await submitReport(result, { comment: '', place: '' });
    if (!outcome.ok) expect(outcome.message).toContain('rechazó');
  });

  it('explica que una URL rechazada no se guardo', async () => {
    postJson.mockRejectedValue(new ApiError('INVALID_URL', 'x', false, 400));

    const outcome = await submitReport(result, { comment: '', place: '' });
    if (!outcome.ok) expect(outcome.message).toContain('no se guardó');
  });

  it('conserva lo escrito: el fallo no destruye el borrador', async () => {
    postJson.mockRejectedValue(new ApiError('NETWORK', 'x', true, null));
    const draft = { comment: 'me lo encontre en un parqueo', place: 'Zona 10' };

    await submitReport(result, draft);

    expect(draft).toEqual({ comment: 'me lo encontre en un parqueo', place: 'Zona 10' });
  });

  it('tampoco lanza ante un error inesperado', async () => {
    postJson.mockRejectedValue(new Error('algo raro'));
    await expect(submitReport(result, { comment: '', place: '' })).resolves.toMatchObject({
      ok: false,
    });
  });
});
