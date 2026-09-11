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
  postJson.mockResolvedValue({ reportId: 'rpt_1' });
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

describe('buildReportPayload', () => {
  const now = new Date(2026, 8, 9, 9, 20, 0);

  it('incluye lo obligatorio', () => {
    const payload = buildReportPayload(result, { comment: '', place: '' }, now);

    expect(payload.url).toBe('https://pagos-multas-gt.info/pago');
    expect(payload.verdict).toBe('sospechoso');
    expect(payload.reportedAt).toBe(now.toISOString());
  });

  it('omite los opcionales vacios en vez de mandar cadenas vacias', () => {
    const payload = buildReportPayload(result, { comment: '   ', place: '' }, now);
    expect(payload).not.toHaveProperty('comment');
    expect(payload).not.toHaveProperty('place');
  });

  it('recorta los espacios de los opcionales', () => {
    const payload = buildReportPayload(result, { comment: '  hola  ', place: ' ahi ' }, now);
    expect(payload.comment).toBe('hola');
    expect(payload.place).toBe('ahi');
  });

  it('incluye scanId solo si el analisis lo trae', () => {
    expect(buildReportPayload(result, { comment: '', place: '' }, now)).not.toHaveProperty('scanId');

    const conId = buildReportPayload(
      { ...result, scanId: 'scn_8f2a91c4' },
      { comment: '', place: '' },
      now,
    );
    expect(conId.scanId).toBe('scn_8f2a91c4');
  });

  it('es anonimo: no lleva identificador de usuario ni coordenadas', () => {
    const payload = buildReportPayload(result, { comment: 'x', place: 'y' }, now);
    const keys = Object.keys(payload);

    expect(keys).not.toContain('userId');
    expect(keys).not.toContain('deviceId');
    expect(keys).not.toContain('latitude');
    expect(keys).not.toContain('longitude');
  });
});

describe('submitReport', () => {
  it('devuelve ok cuando el envio funciona', async () => {
    await expect(submitReport(result, { comment: 'hola', place: '' })).resolves.toEqual({
      ok: true,
    });
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it('no lanza ante un fallo de red: devuelve el motivo', async () => {
    // Lo importante es que la pantalla pueda conservar lo que se escribio.
    postJson.mockRejectedValue(new ApiError('NETWORK', 'x', true, null));

    const outcome = await submitReport(result, { comment: 'hola', place: '' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.retryable).toBe(true);
      expect(outcome.message).toContain('conexión');
    }
  });

  it('marca como no reintentable un rechazo del servidor', async () => {
    postJson.mockRejectedValue(new ApiError('INVALID_PAYLOAD', 'x', false, 400));

    const outcome = await submitReport(result, { comment: '', place: '' });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.retryable).toBe(false);
  });

  it('tampoco lanza ante un error inesperado', async () => {
    postJson.mockRejectedValue(new Error('algo raro'));
    await expect(submitReport(result, { comment: '', place: '' })).resolves.toMatchObject({
      ok: false,
    });
  });
});
