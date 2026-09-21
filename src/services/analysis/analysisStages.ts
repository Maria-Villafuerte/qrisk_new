import type { AnalysisStageKey } from './types';

/**
 * Etapas de la cascada, en orden. La pantalla de carga las recorre para
 * mostrar el progreso mientras el backend responde.
 *
 * Solo estan las etapas de los filtros ACTIVOS (ver `enabledFilters.ts`). Las
 * de F2.1 y F2.2 quedan escritas y comentadas aqui abajo.
 *
 * Este archivo se llamaba `analysisService.ts` y ademas contenia el mock y el
 * interruptor mock/real. Los dos se eliminaron el 2026-09-20, cuando el
 * backend empezo a responder: la app ya no tiene implementacion de mentira que
 * elegir, asi que las pantallas usan `remoteAnalysisService` directamente y
 * aqui solo queda el copy de la cascada.
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
  // POR QUE ESTAN APAGADAS: el backend no las reporta como etapas separadas.
  // Hoy manda un solo puntaje heuristico con sus criterios, y todo eso se
  // pinta en la seccion de reputacion. Anunciar tres etapas cuando solo hay
  // una respuesta haria que la pantalla de carga dijera "Analizando la
  // estructura del enlace…" sin que nada de eso este pasando por separado.
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
