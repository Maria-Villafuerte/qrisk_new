import { localF1Verdict, type F1Verdict } from './localF1';
import { lookupPhishTank, type PhishTankLookup } from './phishTank';
import { isSafeBrowsingConfigured, lookupSafeBrowsing, type SafeBrowsingLookup } from './safeBrowsing';

/**
 * Filtro F1 completo: listas de reputacion.
 *
 * Es el Objetivo Especifico 4 del protocolo ("integrar el filtro F1 de consulta
 * a listas de reputacion con tiempo de respuesta inferior a 5 segundos"), y
 * reune las tres fuentes que la app consulta:
 *
 *   1. La lista LOCAL de dominios confiables (`localF1.ts`). Instantanea, sin
 *      red. Solo puede decir SEGURO.
 *   2. Google Safe Browsing (`safeBrowsing.ts`). Solo puede decir MALICIOSO.
 *   3. PhishTank (`phishTank.ts`). Solo puede decir MALICIOSO.
 *
 * Las dos remotas se consultan EN PARALELO, cada una con tope de 4 s: T_F1
 * queda acotado por el tope (~4 s), no por la suma (8 s). Es la "ejecucion
 * paralela de las consultas (Promise.all)" del riesgo R2 del protocolo.
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
  source: 'lista_local' | 'safe_browsing' | 'phishtank' | 'ninguna';
  /** Milisegundos que tardo F1 en total. */
  elapsedMs: number;
  /** Si el dominio esta en la lista local de confianza (`localF1.ts`). */
  localTrusted: boolean;
  /**
   * Que respondio Safe Browsing, con el detalle que el veredicto colapsa: no es
   * lo mismo "no la tiene reportada" que "no se pudo consultar". Lo usa la
   * pantalla de detalle para explicar F1 sin afirmar lo que no se verifico.
   */
  safeBrowsing: SafeBrowsingLookup;
  /** Que respondio PhishTank, con el mismo proposito. */
  phishTank: PhishTankLookup;
}

/**
 * Resuelve F1 consultando las tres fuentes.
 *
 * POR QUE LAS LISTAS REMOTAS SE CONSULTAN AUNQUE LA LISTA LOCAL DIGA SEGURO.
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
 * Asi que un SEGURO local es una hipotesis, no una conclusion, y cualquiera de
 * las dos listas remotas tiene derecho a vetarla. Un MALICIOSO siempre gana sobre un SEGURO: en
 * seguridad, la señal de peligro pesa mas que la ausencia de peligro.
 *
 * EL COSTO de no cortar es una llamada de red de hasta 4 s para dominios
 * conocidos. Se acepta: el presupuesto del protocolo para F1 es de 5 s, la
 * cascada completa cuesta 24-35 s, y el riesgo de evasion no vale el ahorro.
 */
export async function f1Verdict(url: string): Promise<F1Outcome> {
  const startedAt = Date.now();
  const local = localF1Verdict(url);
  const localTrusted = local === 'SEGURO';

  // En paralelo: el tiempo de F1 es el de la mas lenta, con tope de 4 s cada
  // una. Ninguna de las dos lanza. Sin clave de Safe Browsing esa consulta no
  // se hace; PhishTank no necesita clave y se consulta siempre.
  const [safeBrowsing, phishTank] = await Promise.all([
    isSafeBrowsingConfigured()
      ? lookupSafeBrowsing(url)
      : Promise.resolve<SafeBrowsingLookup>({ status: 'not_configured' }),
    lookupPhishTank(url),
  ]);

  const outcome = (verdict: F1Verdict, source: F1Outcome['source']): F1Outcome => ({
    verdict,
    source,
    elapsedMs: Date.now() - startedAt,
    localTrusted,
    safeBrowsing,
    phishTank,
  });

  // Un MALICIOSO de cualquiera de las dos manda sobre todo, incluido un SEGURO
  // de la lista local: ver la nota de arriba. Si las dos la reportan, `source`
  // nombra a Safe Browsing; la pantalla muestra las dos de todas formas.
  if (safeBrowsing.status === 'listed') return outcome('MALICIOSO', 'safe_browsing');
  if (phishTank.status === 'listed') return outcome('MALICIOSO', 'phishtank');

  // Ninguna lista la reporta. Si la lista local la avala, ahora si se puede
  // concluir SEGURO: el dominio es confiable Y la URL completa no esta
  // reportada.
  if (localTrusted) return outcome('SEGURO', 'lista_local');

  // Nadie concluyo. Sigue F2.1.
  return outcome('INCIERTO', 'ninguna');
}
