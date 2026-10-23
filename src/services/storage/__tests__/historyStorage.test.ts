import type { AnalysisResult, ScanRecord } from '../../analysis/types';
import {
  appendScan,
  clearHistory,
  HISTORY_LIMIT,
  loadHistory,
  saveHistory,
  withScanAppended,
  type HistoryEntry,
} from '../historyStorage';
import Storage from 'expo-sqlite/kv-store';

/**
 * La metrica pide "historial offline: 100% recuperable sin conexion", asi que
 * lo que se prueba aqui es que lo guardado se recupera intacto, que el tope de
 * 20 se respeta, y que un dato corrupto no deja la app inservible.
 */
const HISTORY_KEY = 'qrisk.history.v1';

const makeEntry = (n: number): HistoryEntry => {
  const record: ScanRecord = {
    id: `scn_${n}`,
    domain: `dominio${n}.com`,
    verdict: 'seguro',
    scannedAt: new Date(2026, 8, 9, 12, 0, 0).toISOString(),
    place: null,
  };
  const analysis: AnalysisResult = {
    verdict: 'seguro',
    domain: record.domain,
    url: `https://${record.domain}`,
    summary: 'Sin señales de riesgo.',
    riskScore: 5,
    sections: [],
  };
  return { record, analysis };
};

beforeEach(() => {
  clearHistory();
});

describe('loadHistory / saveHistory', () => {
  it('arranca vacio', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('recupera intacto lo que guardo (sobrevive cerrar la app)', () => {
    const entries = [makeEntry(1), makeEntry(2)];
    saveHistory(entries);

    // loadHistory relee del almacenamiento, que es lo que pasa al reabrir.
    expect(loadHistory()).toEqual(entries);
  });

  it('guarda el analisis completo, para reabrirlo sin conexion', () => {
    saveHistory([makeEntry(1)]);
    const [entry] = loadHistory();
    expect(entry.analysis.summary).toBe('Sin señales de riesgo.');
    expect(entry.analysis.url).toBe('https://dominio1.com');
  });

  it('recorta al tope al guardar', () => {
    saveHistory(Array.from({ length: 30 }, (_, i) => makeEntry(i)));
    expect(loadHistory()).toHaveLength(HISTORY_LIMIT);
  });
});

describe('appendScan', () => {
  it('pone el mas reciente primero', () => {
    let history: HistoryEntry[] = [];
    history = appendScan(history, makeEntry(1));
    history = appendScan(history, makeEntry(2));

    expect(history.map((e) => e.record.id)).toEqual(['scn_2', 'scn_1']);
    expect(loadHistory().map((e) => e.record.id)).toEqual(['scn_2', 'scn_1']);
  });

  it('respeta el tope de 20 y descarta el mas viejo', () => {
    let history: HistoryEntry[] = [];
    for (let i = 1; i <= 25; i++) history = appendScan(history, makeEntry(i));

    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].record.id).toBe('scn_25');
    // El 5 y anteriores ya salieron; el 6 es el ultimo que queda.
    expect(history.some((e) => e.record.id === 'scn_5')).toBe(false);
    expect(history[HISTORY_LIMIT - 1].record.id).toBe('scn_6');
  });

  it('persiste el recorte, no solo el arreglo en memoria', () => {
    let history: HistoryEntry[] = [];
    for (let i = 1; i <= 25; i++) history = appendScan(history, makeEntry(i));

    expect(loadHistory()).toHaveLength(HISTORY_LIMIT);
    expect(loadHistory()[0].record.id).toBe('scn_25');
  });
});

describe('clearHistory', () => {
  it('vacia el historial', () => {
    saveHistory([makeEntry(1)]);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});

describe('datos corruptos', () => {
  it('devuelve vacio si el JSON no parsea', () => {
    Storage.setItemSync(HISTORY_KEY, '{no es json');
    expect(loadHistory()).toEqual([]);
  });

  it('devuelve vacio si lo guardado no es una lista', () => {
    Storage.setItemSync(HISTORY_KEY, '{"a":1}');
    expect(loadHistory()).toEqual([]);
  });

  it('descarta los registros incompletos y conserva los buenos', () => {
    Storage.setItemSync(
      HISTORY_KEY,
      JSON.stringify([makeEntry(1), { record: { id: 'x' } }, null, 'basura', makeEntry(2)]),
    );

    const loaded = loadHistory();
    expect(loaded).toHaveLength(2);
    expect(loaded.map((e) => e.record.id)).toEqual(['scn_1', 'scn_2']);
  });

  it('descarta las entradas "incierto" que guardaron versiones anteriores', () => {
    // La app ya no tiene ese veredicto: sin descartarlas, la pantalla buscaria
    // un tema visual que no existe y se romperia.
    const old = makeEntry(3);
    const incierto = {
      record: { ...old.record, verdict: 'incierto' },
      analysis: { ...old.analysis, verdict: 'incierto' },
    };
    Storage.setItemSync(HISTORY_KEY, JSON.stringify([makeEntry(1), incierto, makeEntry(2)]));

    expect(loadHistory().map((e) => e.record.id)).toEqual(['scn_1', 'scn_2']);
  });
});

/**
 * La captura de F2.3 es una URL firmada que caduca en una hora. Guardarla en
 * el historial seria llenar el disco de enlaces muertos.
 */
describe('appendScan · la captura no se persiste', () => {
  const conCaptura: HistoryEntry = {
    record: {
      id: 'scn_1',
      domain: 'ejemplo.com',
      verdict: 'seguro',
      scannedAt: '2026-09-30T12:00:00.000Z',
      place: null,
    },
    analysis: {
      verdict: 'seguro',
      domain: 'ejemplo.com',
      url: 'https://ejemplo.com',
      summary: 'Sin señales de riesgo.',
      riskScore: 0,
      sections: [],
      screenshotUrl: 'https://s3.amazonaws.com/shot.png?X-Amz-Expires=3600',
    },
  };

  it('descarta la URL de la captura al guardar', () => {
    const [guardado] = appendScan([], conCaptura);
    expect('screenshotUrl' in guardado.analysis).toBe(false);
  });

  it('conserva todo lo demas del analisis', () => {
    const [guardado] = appendScan([], conCaptura);
    expect(guardado.analysis.verdict).toBe('seguro');
    expect(guardado.analysis.domain).toBe('ejemplo.com');
    expect(guardado.record.id).toBe('scn_1');
  });

  it('tampoco la deja en el disco', () => {
    appendScan([], conCaptura);
    expect(JSON.stringify(loadHistory())).not.toContain('X-Amz-Expires');
  });

  it('no estorba cuando el analisis no trae captura', () => {
    const sinCaptura: HistoryEntry = {
      ...conCaptura,
      analysis: { ...conCaptura.analysis, screenshotUrl: undefined },
    };
    expect(() => appendScan([], sinCaptura)).not.toThrow();
  });
});

/**
 * `withScanAppended` es la mitad PURA de `appendScan`. Existe para que
 * `AppStateContext` pueda calcular la lista nueva dentro de un updater de
 * `setState` —donde React puede invocar la funcion mas de una vez— sin que la
 * escritura a disco se repita con cada invocacion.
 */
describe('withScanAppended · es pura', () => {
  it('no escribe a disco', () => {
    withScanAppended([], makeEntry(1));
    // Lo que importa del arreglo: calcular no persiste.
    expect(Storage.getItemSync(HISTORY_KEY)).toBeNull();
    expect(loadHistory()).toEqual([]);
  });

  it('invocarla dos veces con lo mismo da lo mismo', () => {
    // Es justo lo que hace React al invocar un updater mas de una vez.
    const actual = [makeEntry(2)];
    const entry = makeEntry(1);

    expect(withScanAppended(actual, entry)).toEqual(withScanAppended(actual, entry));
  });

  it('no muta la lista que recibe', () => {
    const actual = [makeEntry(2)];
    withScanAppended(actual, makeEntry(1));
    expect(actual).toHaveLength(1);
  });

  it('pone el mas reciente primero y respeta el tope', () => {
    const llena = Array.from({ length: HISTORY_LIMIT }, (_, i) => makeEntry(i));
    const next = withScanAppended(llena, makeEntry(999));

    expect(next).toHaveLength(HISTORY_LIMIT);
    expect(next[0].record.id).toBe('scn_999');
  });

  it('descarta la captura igual que appendScan', () => {
    const entry = makeEntry(1);
    const conCaptura: HistoryEntry = {
      ...entry,
      analysis: { ...entry.analysis, screenshotUrl: 'https://s3/x.png?X-Amz-Expires=3600' },
    };

    expect('screenshotUrl' in withScanAppended([], conCaptura)[0].analysis).toBe(false);
  });

  it('appendScan sigue haciendo las dos cosas: calcular y guardar', () => {
    // No regresion: la funcion original no cambio de comportamiento.
    const next = appendScan([], makeEntry(1));
    expect(next).toHaveLength(1);
    expect(loadHistory()).toHaveLength(1);
  });
});

/**
 * El historial es por sitio, no por escaneo: volver a escanear un dominio no
 * agrega otra fila, sube la que habia con el analisis nuevo.
 */
describe('historial agrupado por sitio', () => {
  /** Mismo dominio que `makeEntry(n)`, pero otro escaneo con otro veredicto. */
  const rescan = (n: number, domain = `dominio${n}.com`): HistoryEntry => {
    const base = makeEntry(n);
    return {
      record: { ...base.record, id: `scn_${n}_again`, domain, verdict: 'sospechoso' },
      analysis: { ...base.analysis, domain, verdict: 'sospechoso' },
    };
  };

  it('el mismo dominio deja una sola fila, arriba y con el analisis nuevo', () => {
    let history: HistoryEntry[] = [];
    history = appendScan(history, makeEntry(1));
    history = appendScan(history, makeEntry(2));
    history = appendScan(history, rescan(1));

    expect(history.map((e) => e.record.domain)).toEqual(['dominio1.com', 'dominio2.com']);
    expect(history[0].record.id).toBe('scn_1_again');
    expect(history[0].analysis.verdict).toBe('sospechoso');
  });

  it('www y mayusculas cuentan como el mismo sitio', () => {
    let history: HistoryEntry[] = [];
    history = appendScan(history, makeEntry(1));
    history = appendScan(history, rescan(1, 'WWW.Dominio1.com'));

    expect(history).toHaveLength(1);
    expect(history[0].record.id).toBe('scn_1_again');
  });

  it('no fusiona analisis fallidos sin dominio que vienen de URLs distintas', () => {
    const sinDominio = (n: number): HistoryEntry => {
      const base = makeEntry(n);
      return {
        record: { ...base.record, domain: '' },
        analysis: { ...base.analysis, domain: '', url: `https://roto${n}` },
      };
    };

    const history = appendScan(appendScan([], sinDominio(1)), sinDominio(2));
    expect(history).toHaveLength(2);
  });

  it('loadHistory limpia los duplicados que ya estaban guardados', () => {
    Storage.setItemSync(
      HISTORY_KEY,
      JSON.stringify([rescan(1), makeEntry(2), makeEntry(1)]),
    );

    const loaded = loadHistory();
    expect(loaded.map((e) => e.record.id)).toEqual(['scn_1_again', 'scn_2']);
  });
});
