import {
  classificationScores,
  detectionMetrics,
  falsePositiveMetrics,
  type DetectionSample,
} from '../detectionMetrics';

const sample = (verdict: DetectionSample['verdict'], n = 1): DetectionSample[] =>
  Array.from({ length: n }, (_, i) => ({ url: `https://x${i}.test/`, verdict }));

describe('detectionMetrics · muestra de URLs maliciosas', () => {
  it('cuenta cada veredicto', () => {
    const m = detectionMetrics([
      ...sample('malicioso', 3),
      ...sample('sospechoso', 5),
      ...sample('seguro', 1),
    ]);

    expect(m).toMatchObject({
      total: 9,
      malicious: 3,
      suspicious: 5,
      safe: 1,
    });
  });

  /*
   * EL CASO QUE JUSTIFICA LAS DOS METRICAS. Un sistema que advierte sobre 8 de
   * cada 10 URLs maliciosas cumple su proposito, pero la TDM estricta lo
   * reporta como 30 % porque solo 3 llevaron la etiqueta "malicioso".
   */
  it('distingue la TDM estricta de la tasa de advertencia', () => {
    const m = detectionMetrics([
      ...sample('malicioso', 3),
      ...sample('sospechoso', 5),
      ...sample('seguro', 2),
    ]);

    expect(m.strictTdmPct).toBe(30);
    expect(m.warningRatePct).toBe(80);
  });

  it('cuenta los falsos negativos, que son el error grave', () => {
    // Un "sospechoso" de menos es una etiqueta conservadora; un "seguro" sobre
    // una URL maliciosa invita a entrar.
    const m = detectionMetrics([...sample('malicioso', 9), ...sample('seguro', 1)]);

    expect(m.falseNegativePct).toBe(10);
  });

  it('redondea a un decimal', () => {
    // 1 de 3 = 33.333... La precision de una muestra de 50 no justifica mas.
    expect(detectionMetrics([...sample('malicioso'), ...sample('seguro', 2)]).strictTdmPct).toBe(
      33.3,
    );
  });

  it('una muestra vacia da cero, no NaN', () => {
    const m = detectionMetrics([]);
    expect(m.strictTdmPct).toBe(0);
    expect(m.warningRatePct).toBe(0);
    expect(m.falseNegativePct).toBe(0);
  });
});

describe('falsePositiveMetrics · muestra de URLs legitimas', () => {
  /*
   * El anteproyecto define TFP como "% de legitimas que reciben MALICIOSO",
   * solo malicioso. Un "sospechoso" sobre un sitio legitimo no cuenta para la
   * metrica, pero si es friccion que la persona percibe, asi que se reporta.
   */
  it('la TFP estricta solo cuenta los maliciosos', () => {
    const m = falsePositiveMetrics([
      ...sample('seguro', 45),
      ...sample('sospechoso', 4),
      ...sample('malicioso', 1),
    ]);

    expect(m.strictFprPct).toBe(2);
    expect(m.anyWarningPct).toBe(10);
  });

  it('cumple el criterio del anteproyecto con 2 de 50', () => {
    const m = falsePositiveMetrics([...sample('seguro', 48), ...sample('malicioso', 2)]);

    expect(m.strictFprPct).toBe(4);
    expect(m.strictFprPct).toBeLessThanOrEqual(5);
  });

  it('cuenta los seguros, que es el resultado correcto aqui', () => {
    expect(falsePositiveMetrics(sample('seguro', 50)).safe).toBe(50);
    expect(falsePositiveMetrics(sample('seguro', 50)).strictFprPct).toBe(0);
  });

  it('una muestra vacia da cero', () => {
    expect(falsePositiveMetrics([]).strictFprPct).toBe(0);
  });
});

describe('classificationScores', () => {
  it('calcula precision, recall y F1 en las dos versiones', () => {
    const maliciosas = [...sample('malicioso', 30), ...sample('sospechoso', 15), ...sample('seguro', 5)];
    const legitimas = [...sample('seguro', 47), ...sample('sospechoso', 2), ...sample('malicioso', 1)];

    const { strict, warning } = classificationScores(maliciosas, legitimas);

    // Estricta: positivo = solo 'malicioso'. TP=30, FP=1, FN=20.
    expect(strict.precision).toBeCloseTo(30 / 31, 2);
    expect(strict.recall).toBeCloseTo(0.6, 2);

    // Advertencia: positivo = 'malicioso' o 'sospechoso'. TP=45, FP=3, FN=5.
    expect(warning.precision).toBeCloseTo(45 / 48, 2);
    expect(warning.recall).toBeCloseTo(0.9, 2);
  });

  it('la version de advertencia nunca tiene menos recall que la estricta', () => {
    // Por construccion: todo lo que cuenta como positivo estricto tambien
    // cuenta como advertencia.
    const maliciosas = [...sample('malicioso', 10), ...sample('sospechoso', 20)];
    const legitimas = sample('seguro', 50);

    const { strict, warning } = classificationScores(maliciosas, legitimas);
    expect(warning.recall).toBeGreaterThanOrEqual(strict.recall);
  });

  it('F1 es la media armonica', () => {
    const { warning } = classificationScores(sample('malicioso', 10), sample('seguro', 10));

    // Sin falsos positivos ni negativos: todo perfecto.
    expect(warning.precision).toBe(1);
    expect(warning.recall).toBe(1);
    expect(warning.f1).toBe(1);
  });

  it('muestras vacias dan cero, no NaN', () => {
    const { strict, warning } = classificationScores([], []);
    expect(strict.f1).toBe(0);
    expect(warning.f1).toBe(0);
  });
});
