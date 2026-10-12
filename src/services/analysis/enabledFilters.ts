import type { AnalysisStageKey } from './types';

/**
 * Filtros de la cascada que esta version de la app ANUNCIA al usuario.
 *
 * Es distinto de `AnalysisStageKey`, que es el vocabulario de claves que la app
 * sabe pintar: aquel es un tipo publico y de entrada —el backend puede mandar
 * cualquiera de esas claves y el adaptador la respeta—, este es una decision de
 * producto sobre que se muestra hoy.
 *
 * LAS TRES ESTAN ACTIVAS DESDE EL 2026-10-11, y eso es un cambio: hasta esa
 * fecha solo se anunciaba 'reputation'.
 *
 * POR QUE ESTABAN APAGADAS. F2.1 y F2.2 existian en el backend desde el
 * 2026-10-01, pero no se reportaban como ETAPAS SEPARADAS: llegaba una sola
 * respuesta plana con todo dentro, sin decir que filtro habia decidido.
 * Anunciar tres etapas para una respuesta indivisible habria sido fingir una
 * cascada observable que no existia.
 *
 * POR QUE SE ENCENDIERON. Con la entrega de F1 + F2.1 + F2.2 + F2.3 la cascada
 * es real y el backend informa `filtro_decisivo` ("F1", "F2.1", "F2.2" o null),
 * asi que ahora se puede decir cual filtro resolvio el caso. Medido el
 * 2026-10-11: corte por F1 ~5 s, por F2.1 24.5 s, por F2.2 28.1 s, sin concluir
 * 33.2 s. Hay etapas distinguibles, con costos distintos y con un orden que el
 * backend respeta.
 *
 * Las señales siguen pintandose juntas en una sola seccion del detalle (ver
 * `sectionFromCriteria` en adaptAnalysis.ts), porque la RESPUESTA sigue siendo
 * plana: el usuario necesita ver la señal, no adivinar que filtro la encontro.
 * Lo que cambio es la pantalla de CARGA, que ahora describe las tres etapas por
 * las que la peticion esta pasando de verdad.
 *
 * COMO APAGAR UN FILTRO (si el backend volviera a unificarlos):
 *   1. Comentar su linea en `ENABLED_FILTERS`, aqui abajo.
 *   2. Solo para la pantalla de carga: comentar tambien su etapa en
 *      `analysisStages` (analysisStages.ts).
 * No hay paso 3: las secciones de relleno (adaptAnalysis.ts) y los acordeones
 * del detalle (app/analysis/details.tsx) leen esta lista y se ajustan solos.
 *
 * F2.3 ('preview') no aparece aqui a proposito, y no es un olvido: no es una
 * etapa que el usuario espere por separado, sino un SUBPRODUCTO de F2.2 —el
 * backend genera la captura dentro de esa etapa y la manda en `screenshot_url`
 * cuando pudo—. La app la pinta en el detalle cuando viene. Darle etapa propia
 * anunciaria un paso que no siempre ocurre: cuando F2.1 corta con score alto,
 * no hay captura (verificado el 2026-10-11).
 */
export const ENABLED_FILTERS: readonly AnalysisStageKey[] = [
  'reputation', // F1 — reputacion: listas locales (localF1.ts) + corte del backend.
  'heuristics', // F2.1 — heuristica: 13 criterios sobre la estructura de la URL.
  'behavior', // F2.2 — comportamiento: URLScan.io y VirusTotal.
];

/**
 * Si esta version anuncia o no un filtro. Las pantallas y el adaptador filtran
 * con esto en vez de comparar contra la lista a mano, para que reactivar un
 * filtro no obligue a buscar todos los sitios donde se compara.
 */
export function isFilterEnabled(key: AnalysisStageKey): boolean {
  return ENABLED_FILTERS.includes(key);
}
