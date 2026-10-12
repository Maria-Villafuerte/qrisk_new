import type { RemoteCriterion } from './adaptAnalysis';

/**
 * Eleva un SOSPECHOSO a MALICIOSO cuando la evidencia de F2.2 lo justifica.
 *
 * POR QUE EXISTE ESTO. El backend nunca devuelve MALICIOSO por comportamiento:
 * su techo es SOSPECHOSO, venga de donde venga la señal. Verificado el
 * 2026-10-11 y confirmado el 2026-10-12: `malware.wicar.org` con 18 motores de
 * VirusTotal marcandolo sale SOSPECHOSO, y un acortador con 2 motores sale
 * tambien SOSPECHOSO. La etiqueta no distingue entre esos dos casos, y son muy
 * distintos.
 *
 * Pero el backend SI manda el dato: `indicadores_f2_2` trae el recuento
 * ("18 motores lo marcan como malicioso") y el veredicto de URLScan. La app
 * puede leer esa evidencia y concluir lo que el backend se queda sin decir,
 * igual que ya hace con el puntaje heuristico (`verdictThresholds.ts`).
 *
 * NO ES UN VEREDICTO INVENTADO, y es la misma defensa que la de los cortes de
 * puntaje: el recuento de motores lo produce VirusTotal, el veredicto de
 * URLScan lo produce URLScan. Lo unico que pone la app es el umbral a partir
 * del cual esa evidencia merece la etiqueta mas grave.
 *
 * CUANDO SE PUEDE BORRAR ESTE ARCHIVO. Cuando el backend concluya MALICIOSO
 * por su cuenta. El adaptador respeta siempre un `veredicto_final` mas grave
 * que el derivado, asi que ese dia esta elevacion deja de cambiar nada sin que
 * haya que tocar codigo; se borra cuando se confirme.
 */

/**
 * Motores de VirusTotal necesarios para elevar a malicioso.
 *
 * Tres y no menos: un solo motor puede ser un falso positivo de un producto
 * agresivo, y dos todavia pueden ser el mismo motor contado por dos marcas que
 * comparten firmas. Tres fuentes independientes coincidiendo es el punto donde
 * la evidencia deja de ser discutible.
 *
 * Tres y no mas porque la metrica de falsos positivos del anteproyecto admite
 * hasta 5 %, y un umbral mas alto dejaria en "sospechoso" sitios que cuatro
 * motores ya marcan: eso es perder deteccion para proteger una metrica que
 * todavia tiene margen.
 *
 * Es el mismo umbral que el README venia proponiendo al backend (§8, punto 1),
 * asi que cuando Fabi lo implemente los dos lados van a coincidir.
 */
export const MALICIOUS_ENGINE_THRESHOLD = 3;

/**
 * Indicadores que, por si solos, significan malicioso sin contar motores.
 *
 * `urlscan_verdict_malicioso`: URLScan cargo el sitio en su entorno y
 * concluyo que es malicioso. Es un veredicto, no una heuristica.
 *
 * `urlscan_scan_eliminado`: URLScan borro el informe despues de analizarlo,
 * lo que segun la documentacion del backend ocurre cuando confirma contenido
 * malicioso. La desaparicion del informe es la señal.
 *
 * Los demas indicadores NO elevan: `redireccion_detectada` y
 * `categorias_riesgo` describen comportamiento sospechoso, no confirmado, y la
 * documentacion del backend advierte que el `detalle` de la redireccion a
 * veces no trae ni la URL destino.
 */
const DECISIVE_INDICATORS = ['urlscan_verdict_malicioso', 'urlscan_scan_eliminado'] as const;

/**
 * Cuantos motores reporta un indicador de VirusTotal.
 *
 * El backend manda el numero dentro del texto ya redactado ("18 motores lo
 * marcan como malicioso"), no en un campo aparte, asi que hay que leerlo de
 * ahi. Se toma el PRIMER numero del texto; si no hay ninguno, devuelve 0.
 */
export function engineCount(detail: string): number {
  const match = /(\d+)/.exec(detail);
  if (!match) return 0;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

/** El motivo por el que se elevo, para poder explicarlo y para los tests. */
export interface EscalationReason {
  /** Clave del indicador que decidio. */
  indicator: string;
  /** Motores que lo marcan, si el indicador los reporta. */
  engines?: number;
}

/**
 * Si la evidencia de comportamiento justifica elevar a malicioso.
 *
 * Devuelve el motivo cuando si, o `null` cuando la evidencia no alcanza.
 *
 * SOLO MIRA LOS INDICADORES MALICIOSOS, no los sospechosos:
 * `virustotal_motores_sospechosos` describe motores que dudan, no que
 * concluyen, y 3 motores dudando no equivalen a 3 motores afirmando.
 */
export function behaviorEscalation(
  indicators: RemoteCriterion[] | undefined,
): EscalationReason | null {
  if (!Array.isArray(indicators)) return null;

  for (const item of indicators) {
    const key = (item?.indicador ?? '').trim();
    if (!key) continue;

    if ((DECISIVE_INDICATORS as readonly string[]).includes(key)) {
      return { indicator: key };
    }

    if (key === 'virustotal_motores_maliciosos') {
      const engines = engineCount(item.detalle ?? '');
      if (engines >= MALICIOUS_ENGINE_THRESHOLD) {
        return { indicator: key, engines };
      }
    }
  }

  return null;
}
