import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { analysisByVerdict, nonUrlFixture } from '../services/mock/fixtures';
import type {
  AnalysisResult,
  NonUrlContent,
  ScanRecord,
  VerdictKey,
} from '../services/analysis/types';
import {
  appendScan,
  clearHistory as clearStoredHistory,
  loadHistory,
  type HistoryEntry,
} from '../services/storage/historyStorage';

interface AppStateValue {
  /** Resultado que ven las pantallas de resultado, detalle, reporte y story. */
  result: AnalysisResult;
  setResult: (result: AnalysisResult) => void;
  /**
   * Rota entre los cuatro casos de ejemplo. En el prototipo cada escaneo
   * muestra un veredicto distinto, para poder recorrer todos los estados.
   */
  cycleDemoVerdict: () => AnalysisResult;
  /**
   * Contenido del ultimo QR leido que NO era un enlace. Lo escribe el
   * escaner y lo pinta la pantalla de contenido.
   */
  nonUrlContent: NonUrlContent;
  setNonUrlContent: (content: NonUrlContent) => void;
  /**
   * Si el usuario concedio la ubicacion. Controla que el historial y la
   * Story Card muestren el lugar del escaneo.
   */
  locationEnabled: boolean;
  setLocationEnabled: (enabled: boolean) => void;
  /**
   * Historial persistido, del mas reciente al mas viejo. Se carga del disco
   * en el primer render, asi que ya esta disponible sin conexion.
   */
  history: HistoryEntry[];
  /**
   * Registra un escaneo en el historial y lo guarda en el dispositivo.
   * `place` es null cuando no habia ubicacion disponible.
   */
  addScan: (analysis: AnalysisResult, place?: string | null) => void;
  /** Abre un escaneo guardado: repone su analisis como resultado activo. */
  openHistoryEntry: (entry: HistoryEntry) => void;
  clearHistory: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

/** Orden en que el prototipo recorre los veredictos al escanear. */
const DEMO_ORDER: VerdictKey[] = ['sospechoso', 'seguro', 'malicioso', 'incierto'];

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResult>(analysisByVerdict.sospechoso);
  const [nonUrlContent, setNonUrlContent] = useState<NonUrlContent>(nonUrlFixture);
  const [locationEnabled, setLocationEnabled] = useState(true);
  // Lectura sincrona en el primer render: el kv-store de expo-sqlite lo
  // permite, y asi el historial nunca aparece vacio un instante.
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const addScan = useCallback((analysis: AnalysisResult, place: string | null = null) => {
    const entry: HistoryEntry = {
      record: {
        id: `scn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        domain: analysis.domain,
        verdict: analysis.verdict,
        scannedAt: new Date().toISOString(),
        place,
      },
      analysis,
    };

    setHistory((current) => appendScan(current, entry));
  }, []);

  const openHistoryEntry = useCallback((entry: HistoryEntry) => {
    setResult(entry.analysis);
  }, []);

  const clearHistory = useCallback(() => {
    clearStoredHistory();
    setHistory([]);
  }, []);

  const cycleDemoVerdict = useCallback(() => {
    const currentIndex = DEMO_ORDER.indexOf(result.verdict);
    const next = DEMO_ORDER[(currentIndex + 1) % DEMO_ORDER.length];
    const nextResult = analysisByVerdict[next];
    setResult(nextResult);
    return nextResult;
  }, [result.verdict]);

  const value = useMemo<AppStateValue>(
    () => ({
      result,
      setResult,
      cycleDemoVerdict,
      nonUrlContent,
      setNonUrlContent,
      locationEnabled,
      setLocationEnabled,
      history,
      addScan,
      openHistoryEntry,
      clearHistory,
    }),
    [
      result,
      cycleDemoVerdict,
      nonUrlContent,
      locationEnabled,
      history,
      addScan,
      openHistoryEntry,
      clearHistory,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error('useAppState debe usarse dentro de <AppStateProvider>');
  }
  return value;
}
