import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AnalysisResult, NonUrlContent, ScanRecord } from '../services/analysis/types';
import {
  appendScan,
  clearHistory as clearStoredHistory,
  loadHistory,
  type HistoryEntry,
} from '../services/storage/historyStorage';
import {
  hasLocationEnabled,
  setLocationEnabledStored,
} from '../services/storage/locationStorage';

interface AppStateValue {
  /** Resultado que ven las pantallas de resultado, detalle, reporte y story. */
  result: AnalysisResult;
  setResult: (result: AnalysisResult) => void;
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

/**
 * Estado "todavia no se ha escaneado nada".
 *
 * NO SON DATOS DE DEMOSTRACION. Antes el contexto arrancaba con un caso de
 * ejemplo del mock, asi que una pantalla abierta sin haber escaneado mostraba
 * un veredicto inventado como si fuera real. El mock se elimino el 2026-09-20
 * y estos valores lo reemplazan: son el vacio honesto.
 *
 * En la practica el usuario no los ve, porque a todas las pantallas que leen
 * `result` se llega despues de un escaneo. Existen para que el tipo siga
 * siendo no-nullable y las pantallas no necesiten guardas por todos lados.
 */
const EMPTY_RESULT: AnalysisResult = {
  verdict: 'incierto',
  domain: '',
  url: '',
  summary: 'Todavía no se ha analizado ningún enlace.',
  // El puntaje neutro, nunca uno bajo: un falso "seguro" es el peor
  // resultado posible del producto.
  riskScore: 50,
  sections: [],
};

/** Equivalente para el contenido de un QR que no es enlace. */
const EMPTY_NON_URL: NonUrlContent = {
  kind: 'text',
  label: 'CONTENIDO',
  title: 'Sin contenido',
  description: 'Todavía no se ha leído ningún código.',
  rows: [],
  raw: '',
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResult>(EMPTY_RESULT);
  const [nonUrlContent, setNonUrlContent] = useState<NonUrlContent>(EMPTY_NON_URL);
  // Se lee del disco igual que el historial. Antes arrancaba siempre en
  // `false`, y como el onboarding ya no se repite nadie volvia a encenderlo:
  // tras el primer reinicio el historial dejaba de anotar el lugar en silencio.
  const [locationEnabled, setLocationEnabledState] = useState<boolean>(() =>
    hasLocationEnabled(),
  );

  // La decision se persiste al tomarla, no en un efecto: asi sobrevive aunque
  // el usuario cierre la app inmediatamente despues del onboarding.
  const setLocationEnabled = useCallback((enabled: boolean) => {
    setLocationEnabledStored(enabled);
    setLocationEnabledState(enabled);
  }, []);

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

  const value = useMemo<AppStateValue>(
    () => ({
      result,
      setResult,
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
      nonUrlContent,
      locationEnabled,
      setLocationEnabled,
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
