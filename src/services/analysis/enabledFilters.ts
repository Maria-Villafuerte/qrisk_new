import type { AnalysisStageKey } from './types';

/**
 * Filtros de la cascada que esta version de la app ANUNCIA al usuario.
 *
 * Es distinto de `AnalysisStageKey`, que es el vocabulario de claves que la app
 * sabe pintar: aquel es un tipo publico y de entrada —el backend puede mandar
 * cualquiera de esas claves y el adaptador la respeta—, este es una decision de
 * producto sobre que se muestra hoy.
 *
 * Hoy solo esta activo F1. F2.1 y F2.2 no existen en el backend —el propio
 * endpoint responde "F2.1 aun no implementado (S7)"—, asi que anunciarlos
 * significa pintar un acordeon "SIN COMPLETAR" que nunca se va a completar y
 * una etapa de carga que miente sobre lo que esta pasando. Se prefiere ensenar
 * un filtro honesto que tres, dos de ellos decorativos.
 *
 * COMO REACTIVAR UN FILTRO:
 *   1. Descomentar su linea en `ENABLED_FILTERS`, aqui abajo.
 *   2. Solo para la pantalla de carga: descomentar tambien su etapa en
 *      `analysisStages` (analysisStages.ts), que es la que lleva el copy y los
 *      tiempos de la cascada.
 * No hay paso 3: las secciones de relleno (adaptAnalysis.ts) y los acordeones
 * del detalle (app/analysis/details.tsx) leen esta lista y se ajustan solos. El
 * icono, el titulo y los datos de ejemplo de cada filtro siguen escritos.
 *
 * F2.3 ('preview') no aparece ni comentado: ese filtro no esta implementado en
 * ninguna capa de la app. Reponerlo son los tres pasos de la fila F2.3 del
 * README, empezando por agregar la clave a `AnalysisStageKey`.
 */
export const ENABLED_FILTERS: readonly AnalysisStageKey[] = [
  'reputation', // F1 — reputacion. Unico filtro que el backend responde hoy.
  // 'heuristics', // F2.1 — heuristica. Descomentar cuando exista en el backend.
  // 'behavior',   // F2.2 — comportamiento. Descomentar cuando exista en el backend.
];

/**
 * Si esta version anuncia o no un filtro. Las pantallas y el adaptador filtran
 * con esto en vez de comparar contra la lista a mano, para que reactivar un
 * filtro no obligue a buscar todos los sitios donde se compara.
 */
export function isFilterEnabled(key: AnalysisStageKey): boolean {
  return ENABLED_FILTERS.includes(key);
}
