import type { AnalysisStageKey } from './types';

/**
 * Filtros de la cascada que esta version de la app ANUNCIA al usuario.
 *
 * Es distinto de `AnalysisStageKey`, que es el vocabulario de claves que la app
 * sabe pintar: aquel es un tipo publico y de entrada —el backend puede mandar
 * cualquiera de esas claves y el adaptador la respeta—, este es una decision de
 * producto sobre que se muestra hoy.
 *
 * Hoy solo esta activa una entrada. OJO CON EL PORQUE, que cambio:
 *
 * F2.1 y F2.2 SI EXISTEN en el backend —verificado el 2026-10-01: devuelve
 * `criterios_f2_1` poblados y `indicadores_f2_2` con el recuento de motores de
 * VirusTotal—. Lo que no hace es reportarlos como ETAPAS SEPARADAS: manda una
 * sola respuesta plana con todo dentro, sin decir que filtro corrio cuando.
 *
 * Por eso siguen apagados aqui. Encenderlos pintaria tres acordeones y tres
 * etapas de carga para una sola respuesta: la pantalla diria "Observando el
 * comportamiento en entorno aislado..." como si fuera un paso aparte que se
 * puede ver empezar y terminar, y no lo es. Lo que SI llega de esos filtros no
 * se pierde: `adaptAnalysis.ts` junta las dos listas en la seccion activa, asi
 * que la evidencia de VirusTotal se muestra aunque 'behavior' este apagado.
 *
 * Se prefiere ensenar una seccion honesta con todas las señales dentro, que
 * tres secciones que fingen una cascada que el backend no reporta.
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
