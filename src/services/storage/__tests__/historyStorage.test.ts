import type { AnalysisResult, ScanRecord } from '../../analysis/types';
import {
  appendScan,
  clearHistory,
  HISTORY_LIMIT,
  loadHistory,
  saveHistory,
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
});
