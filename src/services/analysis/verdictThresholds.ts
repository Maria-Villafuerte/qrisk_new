import type { VerdictKey } from './types';

/**
 * Traduce el `score_heuristico` del backend a uno de los tres veredictos.
 *
 * POR QUE EXISTE ESTO, Y POR QUE SIGUE EXISTIENDO DESPUES DEL 2026-10-11.
 *
 * Hasta esa fecha el backend respondia "PENDIENTE" a todo, incluso a
 * google.com, y sin esta traduccion cada analisis habria terminado sin
 * veredicto. Eso cambio: con la cascada completa entregada, el backend ya
 * concluye SEGURO, SOSPECHOSO y MALICIOSO de verdad (medido el 2026-10-11).
 *
 * Pero PENDIENTE no desaparecio, y por diseño: el contrato lo define como
 * "ninguna capa concluyente", y el umbral de F2.1 es ESTRICTO (`score > 60`).
 * Dos consecuencias medidas:
 *
 *   - Un score de 55 (TLD de riesgo + sin HTTPS + palabra clave) devuelve
 *     PENDIENTE: tres señales simultaneas que el backend no convierte en
 *     veredicto. Sin esta tabla, esa URL terminaria en un error de "no se
 *     pudo analizar" teniendo evidencia clara.
 *   - Un score de 60 EXACTO tampoco concluye de su lado, por el `>`.
 *
 * Asi que esto ya no suple una ausencia total, sino el tramo que el umbral del
 * backend deja sin cubrir. Actua menos que antes, y solo cuando el veredicto
 * es PENDIENTE (o INCIERTO, o no viene).
 *
 * NO ES UN VEREDICTO INVENTADO: el puntaje y los criterios que lo componen son
 * del backend. Lo unico que pone la app son los cortes.
 *
 * CUANDO SE PUEDE BORRAR ESTO. Cuando el backend deje de devolver PENDIENTE
 * para URLs con señales, es decir cuando conecte su propio umbral sobre el
 * puntaje. El adaptador ya prefiere siempre un `veredicto_final` real, asi que
 * ese dia esta tabla deja de actuar sin tocar una linea.
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

/** El puntaje del backend es una escala 0-100. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/**
 * Veredicto que corresponde a un puntaje.
 *
 * Un puntaje ausente o que no es un numero devuelve `null`, no un veredicto
 * optimista: quien llama decide que hacer con eso (hoy, avisar que el analisis
 * no concluyo).
 * En una app de seguridad, la falta de informacion nunca se pinta de verde.
 *
 * FUERA DE 0-100 TAMBIEN ES `null`, y por la misma razon. Un -20 o un 150 no
 * son "muy seguro" y "muy malicioso": son la señal de que el backend cambio de
 * escala y que estos cortes ya no significan lo que creemos. Interpretarlos
 * con la tabla vieja es justo como se produce un veredicto equivocado con
 * aspecto de correcto —un -20 daria "seguro"—, y un falso "seguro" es el peor
 * resultado posible del producto. Ante una escala que no entendemos, la app
 * no da veredicto y avisa que no pudo analizar el enlace, que es la verdad.
 */
export function verdictFromScore(score: number | undefined): VerdictKey | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (score < SCORE_MIN || score > SCORE_MAX) return null;

  if (score >= VERDICT_THRESHOLDS.malicious) return 'malicioso';
  if (score >= VERDICT_THRESHOLDS.suspicious) return 'sospechoso';
  return 'seguro';
}
