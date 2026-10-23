import { ApiError } from '../../api/errors';
import { classifyQr } from '../../qr';
import { remoteAnalysisService } from '../remoteAnalysisService';

jest.mock('../../api/httpClient', () => ({ postJson: jest.fn() }));
// PhishTank no necesita clave y se consultaria de verdad: los tests no salen a
// la red. Su comportamiento se prueba en phishTank.test.ts.
jest.mock('../phishTank', () => ({
  lookupPhishTank: jest.fn(async () => ({ status: 'not_listed' })),
}));
const { postJson } = require('../../api/httpClient') as { postJson: jest.Mock };

/**
 * Contrato entre el servicio y la pantalla de carga.
 *
 * El servicio deja subir todos los fallos como ApiError, y la pantalla decide:
 * INVALID_URL significa que el QR no llevaba un enlace analizable (pantalla de
 * contenido); el resto es un aviso de error. Si la pantalla no los atrapa, la
 * espera se queda girando para siempre. Estas pruebas fijan las dos mitades
 * del contrato.
 */
beforeEach(() => {
  postJson.mockReset();
});

describe('INVALID_URL sube al llamador', () => {
  it('el servicio relanza el error en vez de degradar', async () => {
    postJson.mockRejectedValue(new ApiError('INVALID_URL', 'no válida', false, 400));

    // Si esto dejara de lanzar, la pantalla nunca sabria que el QR no era un
    // enlace y mostraria un veredicto inventado.
    await expect(remoteAnalysisService.analyze('Mesa 12')).rejects.toMatchObject({
      code: 'INVALID_URL',
    });
  });

  it('el resto de los fallos tambien sube, con su codigo', async () => {
    for (const code of ['NETWORK', 'TIMEOUT', 'INTERNAL', 'RATE_LIMITED'] as const) {
      postJson.mockRejectedValue(new ApiError(code, 'x', true, null));

      await expect(remoteAnalysisService.analyze('https://ejemplo.com')).rejects.toMatchObject({
        code,
      });
    }
  });
});

describe('lo que hace la pantalla con ese error', () => {
  it('el contenido no-URL se puede reconstruir desde el texto escaneado', () => {
    // Es lo que hace el catch de app/analysis/loading.tsx para poder mandar a
    // la pantalla de contenido sin volver a escanear.
    const classified = classifyQr('Mesa 12');

    expect(classified.kind).not.toBe('url');
    if (classified.kind !== 'url') {
      expect(classified.content.raw).toBe('Mesa 12');
      expect(classified.content.label).toBe('TEXTO');
    }
  });

  it('tambien reconstruye un QR de Wi-Fi que el backend rechazo', () => {
    const classified = classifyQr('WIFI:T:WPA2;S:MiRed;P:clave;;');
    if (classified.kind !== 'url') {
      expect(classified.content.label).toBe('RED WI-FI');
    }
  });
});
