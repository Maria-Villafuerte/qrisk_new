import {
  getScanSamples,
  markScanDetected,
  markScanFailed,
  markScanStarted,
  resetScanSamples,
  summarizeScanMetrics,
  T_SCAN_TARGET_MS,
  TDR_TARGET_PCT,
} from '../scanMetrics';

/**
 * Instrumentacion de T_scan. El modulo guarda estado en memoria, asi que cada
 * prueba arranca limpia.
 */
beforeEach(() => {
  resetScanSamples();
});

describe('markScanStarted / markScanDetected', () => {
  it('devuelve null si no habia medicion abierta', () => {
    expect(markScanDetected('https://ejemplo.com')).toBeNull();
    expect(getScanSamples()).toHaveLength(0);
  });

  it('mide el tiempo entre inicio y deteccion', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_850);

    markScanStarted();
    expect(markScanDetected('https://ejemplo.com')).toBe(850);

    nowSpy.mockRestore();
  });

  it('cierra la medicion: dos detecciones seguidas solo cuentan una', () => {
    markScanStarted();
    expect(markScanDetected('a')).not.toBeNull();
    expect(markScanDetected('b')).toBeNull();
    expect(getScanSamples()).toHaveLength(1);
  });

  it('guarda la muestra con fecha ISO y un adelanto del contenido', () => {
    markScanStarted();
    markScanDetected('https://ejemplo.com/una/ruta/muy/larga/que/se/recorta/aqui/mismo');

    const [sample] = getScanSamples();
    expect(sample.preview).toHaveLength(40);
    expect(new Date(sample.at).toISOString()).toBe(sample.at);
  });

  it('resetScanSamples separa tandas de prueba', () => {
    markScanStarted();
    markScanDetected('a');
    resetScanSamples();
    expect(getScanSamples()).toHaveLength(0);
  });
});

describe('summarizeScanMetrics', () => {
  /** Registra una muestra con una duracion exacta. */
  const record = (ms: number) => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(ms);
    markScanStarted();
    markScanDetected('qr');
    nowSpy.mockRestore();
  };

  it('sin muestras no cumple la metrica', () => {
    expect(summarizeScanMetrics()).toEqual({
      count: 0,
      medianMs: 0,
      p90Ms: 0,
      maxMs: 0,
      meetsTarget: false,
      // El TDR se suma al resumen desde que la prueba 1.4 lo necesita: sin
      // nada presentado es 0%, nunca un 100% enganoso.
      failed: 0,
      presented: 0,
      tdrPct: 0,
      meetsTdr: false,
    });
  });

  it('con una sola muestra usa ese valor', () => {
    record(1_200);
    const summary = summarizeScanMetrics();
    expect(summary).toMatchObject({ count: 1, medianMs: 1_200, p90Ms: 1_200, maxMs: 1_200 });
    expect(summary.meetsTarget).toBe(true);
  });

  it('calcula mediana y p90 por interpolacion lineal', () => {
    // 1..10: mediana = 5.5, p90 = posicion 8.1 -> 9.1
    for (let i = 1; i <= 10; i++) record(i);

    const summary = summarizeScanMetrics();
    expect(summary.count).toBe(10);
    expect(summary.medianMs).toBeCloseTo(5.5, 5);
    expect(summary.p90Ms).toBeCloseTo(9.1, 5);
    expect(summary.maxMs).toBe(10);
  });

  it('ordena aunque las muestras lleguen desordenadas', () => {
    [5_000, 100, 3_000].forEach(record);
    const summary = summarizeScanMetrics();
    expect(summary.medianMs).toBe(3_000);
    expect(summary.maxMs).toBe(5_000);
  });

  it('marca fuera de metrica cuando el p90 pasa de 5s', () => {
    // El p90 de 10 muestras cae en la posicion 8.1 (interpolando entre la 9a
    // y la 10a), asi que hacen falta DOS lentas para moverlo: con una sola,
    // el percentil sigue apoyado en las rapidas.
    for (let i = 0; i < 8; i++) record(500);
    record(9_000);
    record(20_000);

    const summary = summarizeScanMetrics();
    expect(summary.p90Ms).toBeGreaterThan(T_SCAN_TARGET_MS);
    expect(summary.meetsTarget).toBe(false);
  });

  it('una sola lectura lenta no arrastra el p90: para eso se usa y no el maximo', () => {
    for (let i = 0; i < 9; i++) record(500);
    record(20_000);

    const summary = summarizeScanMetrics();
    expect(summary.maxMs).toBe(20_000);
    expect(summary.p90Ms).toBeLessThan(T_SCAN_TARGET_MS);
    expect(summary.meetsTarget).toBe(true);
  });

  it('cumple la metrica justo en el limite de 5s', () => {
    for (let i = 0; i < 10; i++) record(T_SCAN_TARGET_MS);
    expect(summarizeScanMetrics().meetsTarget).toBe(true);
  });
});

/**
 * TDR (tasa de deteccion) de la prueba 1.4: detectados / presentados.
 *
 * La app no puede saber sola que hubo un QR enfrente que no logro leer, asi
 * que los fallos los anota quien corre la prueba. Sin este contador habria que
 * llevar la cuenta en papel mientras se escanean 30 codigos.
 */
describe('TDR', () => {
  beforeEach(() => resetScanSamples());

  /** Simula una lectura correcta. */
  const leer = () => {
    markScanStarted();
    markScanDetected('https://ejemplo.com');
  };

  it('es 100% si todo se leyo', () => {
    leer();
    leer();
    const s = summarizeScanMetrics();
    expect(s.tdrPct).toBe(100);
    expect(s.presented).toBe(2);
    expect(s.meetsTdr).toBe(true);
  });

  it('cuenta los fallos en el denominador', () => {
    leer();
    markScanFailed();
    const s = summarizeScanMetrics();
    expect(s.count).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.presented).toBe(2);
    expect(s.tdrPct).toBe(50);
  });

  it('permite anotar varios fallos de una vez', () => {
    leer();
    markScanFailed(3);
    expect(summarizeScanMetrics().failed).toBe(3);
  });

  it('redondea a un decimal, como la tabla de la prueba', () => {
    // 29 de 30 = 96.666…% -> 96.7%
    for (let i = 0; i < 29; i += 1) leer();
    markScanFailed();
    expect(summarizeScanMetrics().tdrPct).toBe(96.7);
  });

  it('aplica el criterio de >= 95%', () => {
    // 19 de 20 = 95% exacto: cumple.
    for (let i = 0; i < 19; i += 1) leer();
    markScanFailed();
    const s = summarizeScanMetrics();
    expect(s.tdrPct).toBe(TDR_TARGET_PCT);
    expect(s.meetsTdr).toBe(true);
  });

  it('no cumple por debajo del criterio', () => {
    // 9 de 10 = 90%.
    for (let i = 0; i < 9; i += 1) leer();
    markScanFailed();
    expect(summarizeScanMetrics().meetsTdr).toBe(false);
  });

  it('sin nada presentado no da un 100% enganoso', () => {
    const s = summarizeScanMetrics();
    expect(s.presented).toBe(0);
    expect(s.tdrPct).toBe(0);
    expect(s.meetsTdr).toBe(false);
  });

  it('un fallo rearranca el cronometro en vez de cancelarlo', () => {
    // Durante la prueba 1.4 no se sale del escaner entre codigo y codigo, y
    // `markScanStarted()` solo corre al recuperar el foco. Si un fallo dejara
    // el cronometro muerto, la siguiente lectura buena no se mediria y la
    // muestra se perderia en silencio.
    markScanStarted();
    markScanFailed();

    expect(markScanDetected('https://x.com')).not.toBeNull();
    expect(summarizeScanMetrics().count).toBe(1);
  });

  it('el tiempo del QR fallido no se le suma a la lectura siguiente', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    // t=0 empieza; a t=9000 se da por fallido; la lectura buena cierra a
    // t=9500, asi que debe medir 500 ms, no 9500.
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(9000).mockReturnValueOnce(9500);
    markScanStarted();
    markScanFailed();
    const elapsed = markScanDetected('https://x.com');
    nowSpy.mockRestore();

    expect(elapsed).toBe(500);
  });

  it('resetScanSamples tambien borra los fallos', () => {
    markScanFailed(5);
    resetScanSamples();
    expect(summarizeScanMetrics().failed).toBe(0);
  });

  it('ignora un conteo negativo', () => {
    markScanFailed(-3);
    expect(summarizeScanMetrics().failed).toBe(0);
  });
});
