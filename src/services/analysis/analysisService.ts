import { analysisMode } from '../api/config';
import { analysisByVerdict } from '../mock/fixtures';
import { remoteAnalysisService } from './remoteAnalysisService';
import type {
  AnalysisResult,
  AnalysisService,
  AnalysisStageKey,
  VerdictKey,
} from './types';

/**
 * Etapas de la cascada, en orden. La pantalla de carga las recorre para
 * mostrar el progreso; los tiempos son los que hacen creible la espera.
 *
 * Solo estan las etapas de los filtros ACTIVOS (ver `enabledFilters.ts`). Las
 * de F2.1 y F2.2 quedan escritas y comentadas aqui abajo.
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
  // --- F2.1 (heuristica) y F2.2 (comportamiento): DESACTIVADAS ---
  //
  // QUE SON: las dos etapas siguientes de la cascada, con el copy y los tiempos
  // que ya venian aprobados del mockup.
  //
  // POR QUE ESTAN APAGADAS: ninguno de los dos filtros existe en el backend (el
  // endpoint responde "F2.1 aun no implementado"). Anunciarlas hacia que la
  // pantalla de carga dijera "Analizando la estructura del enlace…" mientras no
  // se analizaba nada. La lista de filtros activos vive en `enabledFilters.ts`.
  //
  // COMO REACTIVAR: descomentar el objeto de aqui abajo Y su linea en
  // `ENABLED_FILTERS` (src/services/analysis/enabledFilters.ts). Los dos pasos
  // son necesarios: este array manda en la pantalla de carga, aquella lista
  // manda en las secciones del detalle.
  //
  // {
  //   key: 'heuristics',
  //   runningLabel: 'Analizando la estructura del enlace…',
  //   doneLabel: 'Estructura del enlace analizada',
  //   durationMs: 900,
  // },
  // {
  //   key: 'behavior',
  //   runningLabel: 'Observando el comportamiento en entorno aislado…',
  //   doneLabel: 'Comportamiento en entorno aislado',
  //   durationMs: 800,
  // },
];

/**
 * Cuanto tarda el analisis simulado.
 *
 * Antes se derivaba de `analysisStages` con un reduce, pero al quedar F1 como
 * unico filtro activo esa suma bajaba a 700 ms: la pantalla de carga aparecia y
 * se iba en un parpadeo, sin tiempo de leer nada. La espera del mock es una
 * decision de demo —que se vea que el analisis ocurre—, no la suma de unos
 * tiempos de etapa, asi que ahora es su propio valor.
 *
 * 1.6 s deja ver la etapa girando y el esqueleto del resultado sin que la
 * espera se sienta larga, y queda muy por debajo del tope T_F1 <= 5 s.
 */
export const MOCK_ANALYSIS_MS = 1_600;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Implementacion de demostracion: no hace red y siempre resuelve con uno de
 * los cuatro casos de ejemplo. Se elige por el parametro `verdict` de la URL
 * interna para poder recorrer los cuatro estados del prototipo.
 */
class MockAnalysisService implements AnalysisService {
  async analyze(url: string): Promise<AnalysisResult> {
    await delay(MOCK_ANALYSIS_MS);
    return analysisByVerdict[resolveVerdictFromUrl(url)];
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
