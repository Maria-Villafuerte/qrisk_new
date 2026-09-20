import { ENABLED_FILTERS } from './enabledFilters';
import type {
  AnalysisResult,
  AnalysisSection,
  AnalysisStageKey,
  VerdictKey,
} from './types';

/**
 * Adaptador entre la respuesta del backend y lo que pintan las pantallas.
 *
 * El endpoint real todavia no cumple el contrato de `endpoints_api.txt`:
 * responde en espanol, plano, y sin secciones ni puntaje.
 *
 *   { "url", "dominio", "veredicto_final", "filtro_decisivo", "mensaje" }
 *
 * Este modulo absorbe esa diferencia para que las pantallas no se enteren, y
 * para que el dia que Fabi alinee el contrato solo cambie este archivo.
 */

/** Respuesta real observada del endpoint /analyze. */
export interface RemoteAnalysisResponse {
  url?: string;
  dominio?: string;
  veredicto_final?: string;
  filtro_decisivo?: string | null;
  mensaje?: string;
  // Campos del contrato, por si el backend se alinea antes que esta app.
  domain?: string;
  verdict?: string;
  riskScore?: number;
  summary?: string;
  sections?: AnalysisSection[];
  scanId?: string;
  degraded?: boolean;
  pending?: AnalysisStageKey[];
}

/**
 * Veredictos que el backend puede mandar, mapeados a los cuatro que la app
 * sabe pintar. "PENDIENTE" es el quinto valor que hoy devuelve el endpoint:
 * se traduce a "incierto", que es el caso honesto y ya tiene pantalla, color
 * y copy definidos.
 */
const VERDICT_MAP: Record<string, VerdictKey> = {
  SEGURO: 'seguro',
  SOSPECHOSO: 'sospechoso',
  MALICIOSO: 'malicioso',
  INCIERTO: 'incierto',
  PENDIENTE: 'incierto',
};

/**
 * Puntaje neutro para cuando el backend no manda uno. No se inventa un valor
 * bajo: un falso "seguro" es el peor resultado posible del producto.
 */
const NEUTRAL_RISK_SCORE = 50;

/** Traduce el veredicto; lo desconocido cae en "incierto". */
export function mapVerdict(raw: string | undefined): VerdictKey {
  if (!raw) return 'incierto';
  return VERDICT_MAP[raw.trim().toUpperCase()] ?? 'incierto';
}

/** Saca el dominio de una URL sin abrirla, solo como texto. */
export function domainFromUrl(url: string): string {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url.trim());
  const host = match?.[1] ?? url.trim().split(/[/?#]/)[0];
  // Quita credenciales y puerto, que no aportan a reconocer el sitio.
  return host.replace(/^[^@]*@/, '').replace(/:\d+$/, '');
}

/**
 * Seccion que explica, en lenguaje llano, que la cascada no llego hasta el
 * final. El contrato lo pide explicito: nunca se omite una seccion en
 * silencio.
 */
function incompleteSection(key: AnalysisStageKey, title: string, reason: string): AnalysisSection {
  return {
    key,
    title,
    badgeText: 'SIN COMPLETAR',
    badgeTone: 'warn',
    findings: [{ tone: 'warn', text: reason }],
  };
}

/**
 * Titulo de cada seccion de relleno, por clave. Se mantiene el mapa completo
 * aunque hoy solo se pinte F1: reactivar un filtro en `ENABLED_FILTERS` no debe
 * obligar a volver a escribir su titulo aqui.
 */
const PLACEHOLDER_TITLES: Record<AnalysisStageKey, string> = {
  reputation: 'Reputación',
  heuristics: 'Heurística',
  behavior: 'Comportamiento',
};

/**
 * Las secciones de los filtros ACTIVOS, marcadas como no completadas.
 *
 * Antes se rellenaban las tres siempre. Hoy solo se rellenan las que esta
 * version anuncia (`ENABLED_FILTERS`): una seccion "SIN COMPLETAR" de un filtro
 * que el backend ni siquiera intenta correr no informa, solo ocupa pantalla y
 * sugiere que hubo un fallo donde no lo hubo. El contrato —nunca omitir en
 * silencio una seccion que se anuncio— se sigue cumpliendo: lo que no se
 * rellena es justo lo que no se anuncia.
 */
function placeholderSections(reason: string): AnalysisSection[] {
  return ENABLED_FILTERS.map((key) =>
    incompleteSection(key, PLACEHOLDER_TITLES[key], reason),
  );
}

/**
 * Convierte la respuesta del backend en el resultado que consumen las
 * pantallas. Tolera que falten campos: lo que no venga se completa con el
 * caso honesto (incierto + puntaje neutro + secciones sin completar).
 */
export function adaptAnalysisResponse(
  response: RemoteAnalysisResponse,
  requestedUrl: string,
): AnalysisResult {
  const url = response.url ?? requestedUrl;
  const domain = response.dominio ?? response.domain ?? domainFromUrl(url);

  // El backend puede mandar el veredicto en cualquiera de las dos formas.
  const verdict = mapVerdict(response.veredicto_final ?? response.verdict);

  // `mensaje` hoy trae texto de diagnostico ("F2.1 aun no implementado (S7)"),
  // no copy para el usuario: solo se usa si el veredicto vino resuelto.
  const resolved = verdict !== 'incierto';
  const summary =
    response.summary ??
    (resolved && response.mensaje
      ? response.mensaje
      : 'No pudimos completar el análisis. Trata este enlace con precaución.');

  const hasSections = Array.isArray(response.sections) && response.sections.length > 0;
  const sections = hasSections
    ? (response.sections as AnalysisSection[])
    : placeholderSections(
        'El análisis no se completó, así que esta parte no pudo revisarse.',
      );

  // Degradado si el backend lo dice, o si tuvimos que rellenar las secciones.
  const degraded = response.degraded ?? !hasSections;

  return {
    verdict,
    domain,
    url,
    summary,
    riskScore: typeof response.riskScore === 'number' ? response.riskScore : NEUTRAL_RISK_SCORE,
    sections,
    ...(response.scanId ? { scanId: response.scanId } : {}),
    ...(degraded ? { degraded: true } : {}),
    ...(response.pending?.length ? { pending: response.pending } : {}),
  };
}

/**
 * Resultado para cuando el analisis no se pudo hacer (sin red, timeout, 500).
 * Se prefiere un "incierto" honesto a no mostrar nada: el usuario escaneo un
 * QR y merece una respuesta, aunque sea que no se pudo verificar.
 */
export function degradedResult(url: string, reason: string): AnalysisResult {
  return {
    verdict: 'incierto',
    domain: domainFromUrl(url),
    url,
    summary: 'No pudimos completar el análisis. Trata este enlace con precaución.',
    riskScore: NEUTRAL_RISK_SCORE,
    sections: placeholderSections(reason),
    degraded: true,
  };
}
