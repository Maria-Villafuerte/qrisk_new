import { mockAnalysisService } from '../analysisService';
import { analysisByVerdict } from '../../mock/fixtures';

/**
 * El mock es el modo de desarrollo y es lo que corre en el APK de demo, asi
 * que su comportamiento es visible en la defensa: no es "solo para tests".
 *
 * Lo que se prueba aqui nacio de un bug encontrado en el telefono: al escanear
 * cualquier QR que no fuera una de las cuatro URLs de ejemplo, la pantalla
 * mostraba "pagos-multas-gt.info" —el dominio del fixture "sospechoso"— en vez
 * del sitio escaneado. La app parecia ignorar el QR.
 */

jest.useFakeTimers();

/** Resuelve el analisis saltandose la espera simulada del mock. */
async function analyze(url: string) {
  const promise = mockAnalysisService.analyze(url);
  await jest.runAllTimersAsync();
  return promise;
}

describe('mockAnalysisService · la URL escaneada se respeta', () => {
  it('devuelve el sitio escaneado, no el del fixture', async () => {
    const result = await analyze('https://www.mi-restaurante.com/menu');

    expect(result.url).toBe('https://www.mi-restaurante.com/menu');
    expect(result.domain).toBe('www.mi-restaurante.com');
    // El bug: antes salia el dominio del caso "sospechoso".
    expect(result.domain).not.toBe('pagos-multas-gt.info');
  });

  it('saca el dominio de cualquier URL, con puerto o credenciales', async () => {
    const result = await analyze('https://usuario:clave@ejemplo.org:8443/ruta?x=1');
    expect(result.domain).toBe('ejemplo.org');
  });

  it('tambien respeta la URL en los cuatro casos de ejemplo', async () => {
    const seguro = analysisByVerdict.seguro;
    const result = await analyze(seguro.url);

    expect(result.url).toBe(seguro.url);
    expect(result.domain).toBe(seguro.domain);
  });
});

describe('mockAnalysisService · el veredicto', () => {
  it('da el veredicto exacto de cada URL de ejemplo', async () => {
    // Son las cuatro que permiten demostrar los cuatro estados en la defensa
    // (README §6). Si alguna dejara de coincidir, la demo se cae.
    for (const key of ['seguro', 'sospechoso', 'malicioso', 'incierto'] as const) {
      const result = await analyze(analysisByVerdict[key].url);
      expect(result.verdict).toBe(key);
    }
  });

  it('ante una URL desconocida no presume que es segura', async () => {
    // En una app de seguridad, lo desconocido nunca se pinta de verde.
    const result = await analyze('https://sitio-que-nadie-conoce.xyz/algo');
    expect(result.verdict).not.toBe('seguro');
  });

  it('conserva los hallazgos y el puntaje del caso de ejemplo', async () => {
    const result = await analyze('https://otro-sitio-cualquiera.com');
    const fixture = analysisByVerdict.sospechoso;

    expect(result.riskScore).toBe(fixture.riskScore);
    expect(result.sections).toEqual(fixture.sections);
  });
});

describe('mockAnalysisService · no entrega el fixture por referencia', () => {
  it('devuelve un objeto nuevo en cada analisis', async () => {
    const result = await analyze(analysisByVerdict.sospechoso.url);
    expect(result).not.toBe(analysisByVerdict.sospechoso);
  });

  it('modificar un resultado no corrompe los datos de ejemplo', async () => {
    // Sin la copia, una pantalla que mutara el resultado dejaria el fixture
    // roto para el resto de la sesion: todos los escaneos siguientes
    // arrastrarian ese cambio.
    const antes = analysisByVerdict.sospechoso.domain;

    const result = await analyze('https://cualquier-cosa.com/x');
    result.domain = 'modificado.com';

    expect(analysisByVerdict.sospechoso.domain).toBe(antes);
  });
});
