import { localF1Verdict, type F1Verdict } from './localF1';
import { checkSafeBrowsing, isSafeBrowsingConfigured } from './safeBrowsing';

/**
 * Filtro F1 completo: listas de reputacion.
 *
 * Es el Objetivo Especifico 4 del protocolo ("integrar el filtro F1 de consulta
 * a listas de reputacion con tiempo de respuesta inferior a 5 segundos"), y
 * reune las dos fuentes que la app consulta:
 *
 *   1. La lista LOCAL de dominios confiables (`localF1.ts`). Instantanea, sin
 *      red. Solo puede decir SEGURO.
 *   2. Google Safe Browsing (`safeBrowsing.ts`). Una llamada de red con tope de
 *      4 s. Solo puede decir MALICIOSO.
 *
 * EL ORDEN IMPORTA, Y NO ES EL OBVIO. Se consulta primero la lista local, pero
 * NO por velocidad: es por seguridad. Ver `f1Verdict`.
 */

/** Lo que F1 le reporta al backend en `resultadoF1`. */
export type { F1Verdict };

/** Detalle de como se resolvio F1. Para diagnostico y para la tesis. */
export interface F1Outcome {
  verdict: F1Verdict;
  /** Que fuente decidio. 'ninguna' = nadie concluyo, sigue la cascada. */
  source: 'lista_local' | 'safe_browsing' | 'ninguna';
  /** Milisegundos que tardo F1 en total. */
  elapsedMs: number;
}

/**
 * Resuelve F1 consultando las dos fuentes.
 *
 * POR QUE SAFE BROWSING SE CONSULTA AUNQUE LA LISTA LOCAL DIGA SEGURO.
 *
 * El orden intuitivo seria: si la lista local dice SEGURO, cortar ahi y
 * ahorrarse la llamada de red. Eso es exactamente lo que NO se hace, y vale
 * explicar por que.
 *
 * Un dominio de la lista local puede estar comprometido. `github.com` es
 * confiable como dominio, pero una pagina concreta alojada ahi puede servir
 * contenido malicioso —GitHub Pages, un repositorio con un ejecutable, un
 * gist—. Safe Browsing opera sobre la URL COMPLETA, no sobre el dominio: puede
 * conocer `github.com/usuario/repo-malicioso` sin que eso diga nada de
 * `github.com`.
 *
 * Si la lista local cortara, un atacante solo tendria que alojar su pagina bajo
 * uno de los seis dominios confiables para que la app la declarara segura sin
 * consultar nada. La whitelist se convertiria en una via de evasion.
 *
 * Asi que un SEGURO local es una hipotesis, no una conclusion, y Safe Browsing
 * tiene derecho a vetarla. Un MALICIOSO siempre gana sobre un SEGURO: en
 * seguridad, la señal de peligro pesa mas que la ausencia de peligro.
 *
 * EL COSTO de no cortar es una llamada de red de hasta 4 s para dominios
 * conocidos. Se acepta: el presupuesto del protocolo para F1 es de 5 s, la
 * cascada completa cuesta 24-35 s, y el riesgo de evasion no vale el ahorro.
 */
export async function f1Verdict(url: string): Promise<F1Outcome> {
  const startedAt = Date.now();
  const local = localF1Verdict(url);

  // Sin clave configurada, F1 se queda con lo que diga la lista local. La app
  // funciona igual y la cascada decide el resto.
  if (!isSafeBrowsingConfigured()) {
    return {
      verdict: local,
      source: local === 'INCIERTO' ? 'ninguna' : 'lista_local',
      elapsedMs: Date.now() - startedAt,
    };
  }

  const remote = await checkSafeBrowsing(url);

  // Un MALICIOSO de Safe Browsing manda sobre cualquier cosa, incluido un
  // SEGURO de la lista local: ver la nota de arriba.
  if (remote === 'MALICIOSO') {
    return { verdict: 'MALICIOSO', source: 'safe_browsing', elapsedMs: Date.now() - startedAt };
  }

  // Safe Browsing no conoce la URL. Si la lista local la avala, ahora si se
  // puede concluir SEGURO: el dominio es confiable Y la URL completa no esta
  // reportada.
  if (local === 'SEGURO') {
    return { verdict: 'SEGURO', source: 'lista_local', elapsedMs: Date.now() - startedAt };
  }

  // Nadie concluyo. Sigue F2.1.
  return { verdict: 'INCIERTO', source: 'ninguna', elapsedMs: Date.now() - startedAt };
}
