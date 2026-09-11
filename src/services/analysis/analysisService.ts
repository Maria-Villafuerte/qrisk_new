import { analysisMode } from '../api/config';
import { analysisByVerdict, historyFixture } from '../mock/fixtures';
import { remoteAnalysisService } from './remoteAnalysisService';
import type {
  AnalysisResult,
  AnalysisService,
  AnalysisStageKey,
  ScanRecord,
  VerdictKey,
} from './types';

/**
 * Etapas de la cascada, en orden. La pantalla de carga las recorre para
 * mostrar el progreso; los tiempos son los que hacen creible la espera.
 */
export const analysisStages: {
  key: AnalysisStageKey;
  /** Texto mientras la etapa esta en curso. */
  runningLabel: string;
  /** Texto cuando ya termino. */
  doneLabel: string;
  /** Milisegundos que tarda esta etapa. */
  durationMs: number;
}[] = [
  {
    key: 'reputation',
    runningLabel: 'Consultando listas de reputación…',
    doneLabel: 'Reputación — sin coincidencias en listas negras',
    durationMs: 700,
  },
  {
    key: 'heuristics',
    runningLabel: 'Analizando la estructura del enlace…',
    doneLabel: 'Estructura del enlace analizada',
    durationMs: 900,
  },
  {
    key: 'behavior',
    runningLabel: 'Observando el comportamiento en entorno aislado…',
    doneLabel: 'Comportamiento en entorno aislado',
    durationMs: 800,
  },
];

/** Duracion total del analisis simulado. */
export const TOTAL_ANALYSIS_MS = analysisStages.reduce(
  (total, stage) => total + stage.durationMs,
  0,
);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Implementacion de demostracion: no hace red y siempre resuelve con uno de
 * los cuatro casos de ejemplo. Se elige por el parametro `verdict` de la URL
 * interna para poder recorrer los cuatro estados del prototipo.
 */
class MockAnalysisService implements AnalysisService {
  async analyze(url: string): Promise<AnalysisResult> {
    await delay(TOTAL_ANALYSIS_MS);
    return analysisByVerdict[resolveVerdictFromUrl(url)];
  }

  async getHistory(): Promise<ScanRecord[]> {
    await delay(120);
    return historyFixture;
  }
}

/** Deduce que caso de ejemplo corresponde a una URL dada. */
function resolveVerdictFromUrl(url: string): VerdictKey {
  const match = (Object.keys(analysisByVerdict) as VerdictKey[]).find(
    (key) => analysisByVerdict[key].url === url,
  );
  return match ?? 'sospechoso';
}

/** El mock se conserva como modo de desarrollo y para las pruebas. */
export const mockAnalysisService: AnalysisService = new MockAnalysisService();

/**
 * Implementacion activa. Se elige por configuracion (`expo.extra.analysisMode`
 * en app.json, o EXPO_PUBLIC_ANALYSIS_MODE), asi que las pantallas importan
 * siempre lo mismo y no saben cual esta corriendo.
 */
export const analysisService: AnalysisService =
  analysisMode === 'remote' ? remoteAnalysisService : mockAnalysisService;
