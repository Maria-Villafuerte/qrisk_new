import { domainFromUrl } from './adaptAnalysis';

/**
 * Filtro F1 local: listas de reputacion que viajan en la app.
 *
 * QUE ES F1 Y POR QUE ESTA AQUI. La cascada del anteproyecto empieza por un
 * filtro de reputacion: si el dominio esta en una lista confiable, el analisis
 * termina ahi sin gastar los filtros caros. El backend implementa el CORTE
 * (`POST /analyze` acepta `resultadoF1` y responde en ~5 s cuando vale SEGURO o
 * MALICIOSO), pero no implementa las LISTAS: espera que el cliente las
 * consulte y le mande la conclusion.
 *
 * La alternativa era mandar siempre "INCIERTO" y dejar que la cascada entera
 * corriera para todo. Se descarto porque el backend tarda 24-35 s en ese
 * camino, y porque un dominio como `github.com` no necesita que un navegador
 * headless le tome una captura para saber que no es phishing.
 *
 * LAS DOS REGLAS QUE HACEN QUE ESTO NO SEA UNA VULNERABILIDAD:
 *
 *   1. COINCIDENCIA EXACTA DE DOMINIO, nunca por substring. `includes()` o un
 *      `endsWith()` suelto convertirian la whitelist en el agujero que intenta
 *      cerrar: `google.com.phishing.top` contiene "google.com" y
 *      `no-github.com` termina en "github.com". Los dos son dominios de un
 *      atacante y los dos pasarian. Aqui se compara el host completo, o un
 *      subdominio con un punto delante (`mail.google.com` si `google.com` esta
 *      en la lista, pero NO `googlecom.evil.top`).
 *
 *   2. SOLO HTTPS. Un `http://google.com` sin cifrar no se marca seguro: el
 *      dominio puede ser legitimo y la conexion seguir siendo interceptable, y
 *      un QR que apunta a la version sin HTTPS de un sitio conocido es
 *      exactamente lo que haria un ataque en red local.
 *
 * LO QUE ESTA LISTA NO ES. No es una lista de "sitios buenos de internet":
 * es un atajo para un punado de dominios cuya reputacion no esta en duda y que
 * aparecen en las pruebas del proyecto. No se amplia sin criterio: cada entrada
 * nueva es una afirmacion de confianza que hay que poder defender.
 *
 * NO HAY LISTA NEGRA LOCAL, a proposito. Una blacklist en el telefono quedaria
 * obsoleta el dia que se compila y daria una falsa sensacion de cobertura: los
 * dominios maliciosos se crean y mueren en horas. Esa deteccion le toca a F2.2
 * (VirusTotal y URLScan.io), que consulta en vivo. Si alguna vez se agrega,
 * tiene que venir de una fuente que se actualice, no de este archivo.
 */

/** Lo que el backend acepta en `resultadoF1`. */
export type F1Verdict = 'SEGURO' | 'MALICIOSO' | 'INCIERTO';

/**
 * Dominios de reputacion no discutida, en minusculas y sin `www.`.
 *
 * Criterio de inclusion: infraestructura de desarrollo y plataformas de uso
 * masivo que aparecen en los QRs de prueba del proyecto. Nada de banca ni de
 * servicios donde un falso "seguro" tendria consecuencias economicas: si una
 * entidad bancaria alguna vez entra aqui, tiene que ser con su dominio
 * verificado y con una razon escrita al lado.
 */
const TRUSTED_DOMAINS: readonly string[] = [
  // Plataformas de codigo: aparecen en los QRs de ejemplo del README.
  'github.com',
  'gitlab.com',
  // Buscadores y servicios de uso masivo.
  'google.com',
  'wikipedia.org',
  // Dominios institucionales del proyecto.
  'uvg.edu.gt',
  'expo.dev',
];

/**
 * Si el host es el dominio confiable o un subdominio suyo.
 *
 * `mail.google.com` cuenta (subdominio real, con el punto delante).
 * `googlecom.evil.top` no cuenta. `no-github.com` tampoco.
 */
function matchesDomain(host: string, trusted: string): boolean {
  if (host === trusted) return true;
  return host.endsWith(`.${trusted}`);
}

/**
 * Consulta las listas locales y devuelve lo que se le manda al backend.
 *
 * Devuelve 'INCIERTO' para todo lo que no este en la lista, que es el caso
 * normal: la ausencia de un dominio aqui no dice nada sobre el, solo que esta
 * app no tiene informacion propia y que la cascada tiene que opinar.
 */
export function localF1Verdict(url: string): F1Verdict {
  const trimmed = url.trim();

  // Regla 2: sin HTTPS no hay atajo, por mas conocido que sea el dominio.
  if (!/^https:\/\//i.test(trimmed)) return 'INCIERTO';

  const host = domainFromUrl(trimmed).toLowerCase().replace(/^www\./, '');
  if (!host) return 'INCIERTO';

  // Regla 1: coincidencia exacta de dominio o subdominio con punto.
  const trusted = TRUSTED_DOMAINS.some((domain) => matchesDomain(host, domain));

  return trusted ? 'SEGURO' : 'INCIERTO';
}

/** Para los tests y para documentar la lista en la tesis. */
export const trustedDomainsForReference: readonly string[] = TRUSTED_DOMAINS;
