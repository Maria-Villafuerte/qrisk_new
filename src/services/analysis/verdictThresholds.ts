import type { VerdictKey } from './types';

/**
 * Traduce el `score_heuristico` del backend a uno de los cuatro veredictos.
 *
 * POR QUE EXISTE ESTO. El backend calcula el puntaje bien —detecta TLD de
 * riesgo, host que es una IP, ausencia de HTTPS, palabras clave— pero su campo
 * `veredicto_final` responde "PENDIENTE" a todo, incluso a google.com: el
 * umbral que convierte el puntaje en veredicto no esta conectado de su lado.
 * Sin esta traduccion, cada analisis terminaria en "incierto" y la app no
 * podria decir lo unico que tiene que decir.
 *
 * NO ES UN VEREDICTO INVENTADO: el puntaje y los criterios que lo componen son
 * del backend. Lo unico que pone la app son los cortes.
 *
 * CUANDO SE PUEDE BORRAR ESTO. En cuanto Fabi devuelva un `veredicto_final`
 * real, el adaptador lo prefiere automaticamente y esta tabla deja de actuar
 * (ver `adaptAnalysisResponse`). No hay que tocar nada para que eso pase; se
 * borra este archivo cuando se confirme que el backend ya concluye siempre.
 */

/**
 * Cortes del puntaje. Alineados con los pesos que usa el propio backend, que
 * es de donde sale que sean estos y no otros:
 *
 *   - Un solo criterio menor (sin HTTPS = 15, palabra clave = 15) no alcanza
 *     para asustar a nadie: queda en "seguro". Marcar de riesgo todo sitio sin
 *     HTTPS daria tantos falsos positivos que la app dejaria de creerse.
 *   - 30 es exactamente el peso de "el host es una IP literal", y tambien lo
 *     que suman dos criterios menores. Un sitio asi merece una advertencia,
 *     no una condena: "sospechoso".
 *   - 60 son tres o mas señales a la vez (IP + sin HTTPS + "login", el caso
 *     clasico de phishing). Ahi si se dice "malicioso".
 */
export const VERDICT_THRESHOLDS = {
  /** Desde este puntaje el veredicto es "sospechoso". */
  suspicious: 30,
  /** Desde este puntaje el veredicto es "malicioso". */
  malicious: 60,
} as const;

/**
 * Veredicto que corresponde a un puntaje.
 *
 * Un puntaje ausente o que no es un numero devuelve `null`, no un veredicto
 * optimista: quien llama decide que hacer con eso (hoy, dejarlo en "incierto").
 * En una app de seguridad, la falta de informacion nunca se pinta de verde.
 */
export function verdictFromScore(score: number | undefined): VerdictKey | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;

  if (score >= VERDICT_THRESHOLDS.malicious) return 'malicioso';
  if (score >= VERDICT_THRESHOLDS.suspicious) return 'sospechoso';
  return 'seguro';
}
