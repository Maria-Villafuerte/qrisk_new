import { ENABLED_FILTERS } from './enabledFilters';
import type {
  AnalysisResult,
  AnalysisSection,
  AnalysisStageKey,
  Finding,
  VerdictKey,
} from './types';
import { verdictFromScore } from './verdictThresholds';

/**
 * Adaptador entre la respuesta del backend y lo que pintan las pantallas.
 *
 * El endpoint real no cumple el contrato de `endpoints_api.txt`: responde en
 * espanol, plano, y sin secciones. Forma observada el 2026-09-20:
 *
 *   {
 *     "url", "dominio", "veredicto_final", "filtro_decisivo",
 *     "score_heuristico", "criterios_f2_1", "indicadores_f2_2", "mensaje"
 *   }
 *
 * Este modulo absorbe esa diferencia para que las pantallas no se enteren, y
 * para que el dia que Fabi alinee el contrato solo cambie este archivo.
 */

/** Un criterio de la heuristica, tal como lo manda el backend. */
export interface RemoteCriterion {
  criterio?: string;
  peso?: number;
  /** Texto ya redactado para el usuario: "Host es una IP: 192.168.1.1". */
  detalle: string;
}

/** Respuesta real observada del endpoint /analyze. */
export interface RemoteAnalysisResponse {
  url?: string;
  dominio?: string;
  veredicto_final?: string;
  filtro_decisivo?: string | null;
  mensaje?: string;
  /**
   * Puntaje 0-100 de la heuristica. Es lo unico con lo que hoy se puede
   * concluir un veredicto, porque `veredicto_final` siempre dice "PENDIENTE".
   */
  score_heuristico?: number;
  /** Criterios que sumaron al puntaje. Vienen redactados en espanol. */
  criterios_f2_1?: RemoteCriterion[];
  /** Indicadores de comportamiento. Hasta hoy siempre llego vacio. */
  indicadores_f2_2?: RemoteCriterion[];
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

/**
 * Si el backend DE VERDAD concluyo un veredicto.
 *
 * Hace falta distinguirlo porque `mapVerdict` colapsa "PENDIENTE" y ausencia
 * en el mismo 'incierto' que un "INCIERTO" explicito, y no son lo mismo:
 * "INCIERTO" es una conclusion del backend y se respeta; "PENDIENTE" es que no
 * concluyo, y ahi la app puede deducirlo del puntaje.
 */
function backendConcluded(raw: string | undefined): boolean {
  if (!raw) return false;
  const value = raw.trim().toUpperCase();
  return value !== 'PENDIENTE' && value in VERDICT_MAP;
}

/**
 * Convierte los criterios del backend en la seccion del filtro de reputacion.
 *
 * Los `detalle` vienen ya redactados en espanol ("Host es una IP: 192.168.1.1",
 * "TLD sospechoso: .top"), asi que se muestran tal cual: el backend es el que
 * sabe por que marco lo que marco, y reescribirlo aqui seria inventar.
 *
 * Solo hay dos tonos disponibles, 'ok' y 'warn' (design-system/tokens.ts): un
 * criterio detectado siempre es 'warn', y la ausencia de criterios es 'ok'.
 */
function sectionFromCriteria(criteria: RemoteCriterion[]): AnalysisSection {
  const findings: Finding[] = criteria.map((item) => ({
    tone: 'warn',
    text: item.detalle,
  }));

  return {
    key: 'reputation',
    title: 'Reputación',
    badgeText:
      findings.length === 0
        ? 'SIN ALERTAS'
        : `${findings.length} ${findings.length === 1 ? 'ALERTA' : 'ALERTAS'}`,
    badgeTone: findings.length === 0 ? 'ok' : 'warn',
    findings:
      findings.length > 0
        ? findings
        : [{ tone: 'ok', text: 'No se detectaron señales de riesgo en el enlace.' }],
  };
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

/** Resumen en lenguaje llano para cada veredicto deducido del puntaje. */
const SUMMARY_BY_VERDICT: Record<VerdictKey, string> = {
  seguro: 'No encontramos señales de riesgo en este enlace.',
  sospechoso:
    'Este enlace tiene señales de riesgo. Ábrelo solo si confías en quien puso el código.',
  malicioso:
    'Este enlace es peligroso. No lo abras ni ingreses datos personales en ese sitio.',
  incierto: 'No pudimos completar el análisis. Trata este enlace con precaución.',
};

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

  const rawVerdict = response.veredicto_final ?? response.verdict;

  /*
   * El veredicto sale de una de dos fuentes, en este orden:
   *
   *   1. El backend, si de verdad concluyo algo. Su palabra manda siempre.
   *   2. El puntaje heuristico, si el backend dijo "PENDIENTE" (o no dijo
   *      nada) pero si mando un `score_heuristico`.
   *
   * El orden es lo que hace que esto se desmonte solo: el dia que Fabi
   * conecte su umbral y empiece a mandar SEGURO/SOSPECHOSO/MALICIOSO, la
   * rama 2 deja de ejecutarse sin que haya que tocar una linea.
   */
  const derived = backendConcluded(rawVerdict)
    ? null
    : verdictFromScore(response.score_heuristico);
  const verdict = derived ?? mapVerdict(rawVerdict);

  /*
   * Las secciones tambien salen de una de dos fuentes:
   *
   *   1. `sections[]`, si el backend algun dia cumple el contrato.
   *   2. Los criterios de la heuristica, que es lo que manda hoy.
   *
   * Antes, al no venir `sections[]`, se pintaba un acordeon "SIN COMPLETAR"
   * mientras se tiraban a la basura los criterios que el backend SI habia
   * mandado. Eso era perder la parte mas util de la respuesta.
   */
  const hasSections = Array.isArray(response.sections) && response.sections.length > 0;
  const criteria = response.criterios_f2_1;
  const hasCriteria = Array.isArray(criteria);

  let sections: AnalysisSection[];
  if (hasSections) {
    sections = response.sections as AnalysisSection[];
  } else if (hasCriteria) {
    sections = [sectionFromCriteria(criteria)];
  } else {
    sections = placeholderSections(
      'El análisis no se completó, así que esta parte no pudo revisarse.',
    );
  }

  /*
   * `mensaje` trae diagnostico interno ("F2.1 aun no implementado (S11)"), no
   * copy para el usuario, asi que nunca se muestra. Cuando el veredicto se
   * pudo concluir se usa el texto que corresponde a ese veredicto; si no, el
   * de "incierto", que ya explica que el analisis no se completo.
   */
  const summary = response.summary ?? SUMMARY_BY_VERDICT[verdict];

  /*
   * Degradado = el analisis NO llego a una conclusion. Antes esto era
   * `!hasSections`, que daba un falso positivo en cuanto se empezaron a armar
   * las secciones desde los criterios: el banner de "no pudimos completar
   * todas las verificaciones" salia en analisis que si se habian completado.
   * Lo que de verdad lo define es si hay veredicto.
   */
  const degraded = response.degraded ?? verdict === 'incierto';

  return {
    verdict,
    domain,
    url,
    summary,
    // El puntaje del medidor es el de la heuristica cuando viene; si no, el
    // neutro, que no miente hacia ningun lado.
    riskScore:
      typeof response.riskScore === 'number'
        ? response.riskScore
        : typeof response.score_heuristico === 'number'
          ? response.score_heuristico
          : NEUTRAL_RISK_SCORE,
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
