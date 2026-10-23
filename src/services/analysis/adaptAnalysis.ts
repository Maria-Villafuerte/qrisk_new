import { ApiError } from '../api/errors';
import {
  behaviorEscalation,
  engineCount,
  MALICIOUS_ENGINE_THRESHOLD,
  type EscalationReason,
} from './behaviorEscalation';
import { ENABLED_FILTERS } from './enabledFilters';
import type { F1Outcome } from './f1Filter';
import type {
  AnalysisResult,
  AnalysisSection,
  AnalysisStageKey,
  Finding,
  VerdictKey,
} from './types';
import { SCORE_MAX, SCORE_MIN, VERDICT_THRESHOLDS, verdictFromScore } from './verdictThresholds';

/**
 * Adaptador entre la respuesta del backend y lo que pintan las pantallas.
 *
 * El endpoint responde en espanol, plano y sin secciones. Forma del contrato
 * vigente (`qrisk-endpoint-doc.md`), verificada en vivo el 2026-10-11:
 *
 *   {
 *     "url", "dominio", "veredicto_final", "filtro_decisivo",
 *     "score_heuristico", "criterios_f2_1", "indicadores_f2_2",
 *     "screenshot_url", "desde_cache", "mensaje"
 *   }
 *
 * Este modulo absorbe esa diferencia para que las pantallas no se enteren, y
 * para que un cambio del contrato toque solo este archivo.
 *
 * ESTADO DE LA CASCADA (medido el 2026-10-11, no copiado de la documentacion):
 *
 *   | Caso                        | veredicto_final | filtro | tiempo  |
 *   |-----------------------------|-----------------|--------|---------|
 *   | `resultadoF1` = MALICIOSO   | MALICIOSO       | F1     |  5.3 s  |
 *   | `resultadoF1` = SEGURO      | SEGURO          | F1     |  5.3 s  |
 *   | score 95 (.top + login)     | SOSPECHOSO      | F2.1   | 24.5 s  |
 *   | acortador + VirusTotal      | SOSPECHOSO      | F2.2   | 28.1 s  |
 *   | score 55                    | PENDIENTE       | null   | 24.2 s  |
 *   | github.com (score 0)        | PENDIENTE       | null   | 33.2 s  |
 *
 * De ahi salen dos hechos que este archivo tiene en cuenta:
 *
 *   1. El backend YA CONCLUYE en los cuatro valores del contrato, incluido
 *      MALICIOSO, cosa que no hacia antes del 2026-10-11. La derivacion desde
 *      el puntaje (`verdictFromScore`) por tanto ya casi no actua: solo cuando
 *      el veredicto es PENDIENTE.
 *   2. El umbral de F2.1 es ESTRICTO (`score > 60`), asi que un score de 60
 *      exacto no concluye de su lado y cae en PENDIENTE. Ver la nota de
 *      `verdictThresholds.ts` sobre por que los cortes de la app no cambiaron.
 */

/**
 * Una señal del analisis, tal como la manda el backend.
 *
 * Sirve para las dos listas, que tienen forma casi igual pero no identica:
 *
 *   - `criterios_f2_1[]` usa `criterio` y `peso` (la heuristica, con su aporte
 *     al puntaje).
 *   - `indicadores_f2_2[]` usa `indicador` y NO trae peso (el comportamiento:
 *     URLScan.io y VirusTotal no puntuan, concluyen).
 *
 * Lo unico garantizado en ambas es `detalle`, que es el texto ya redactado en
 * espanol y lo unico que se muestra. Los otros campos son diagnostico.
 */
export interface RemoteCriterion {
  /** Clave del criterio heuristico: "tld_riesgo", "ip_literal", … */
  criterio?: string;
  /**
   * Clave del indicador de comportamiento: "virustotal_motores_maliciosos",
   * "urlscan_verdict_malicioso", "urlscan_scan_eliminado",
   * "redireccion_detectada", "categorias_riesgo", …
   */
  indicador?: string;
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
  /**
   * Indicadores de comportamiento (F2.2), hoy VirusTotal. Verificado el
   * 2026-10-01: `malware.wicar.org` devuelve "18 motores lo marcan como
   * malicioso". Se pintan junto a los criterios de F2.1 (ver
   * `sectionFromCriteria`). Llega vacio cuando VirusTotal no reporta nada.
   */
  indicadores_f2_2?: RemoteCriterion[];
  /**
   * F2.3: captura del sitio en el entorno aislado. URL firmada de S3 que
   * caduca en 1 hora. No siempre viene, y no es un fallo cuando falta: el
   * backend solo la genera si F2.2 alcanzo a producirla. Verificado el
   * 2026-10-11: un corte por F2.1 con score alto no trae captura, porque la
   * cascada no llego a F2.2.
   */
  screenshot_url?: string;
  /**
   * `true` si la respuesta sale de la cache del backend en vez de un analisis
   * recien corrido (TTL del contrato: 7 dias para SOSPECHOSO/MALICIOSO, 24 h
   * para PENDIENTE/SEGURO).
   *
   * El contrato lo declara, pero el 2026-10-11 ninguna de las llamadas de
   * verificacion lo trajo, ni al repetir la misma URL: la segunda consulta
   * volvio a tardar 31 s. Se soporta el campo porque esta en el contrato, y
   * NADA depende de el: es informativo.
   */
  desde_cache?: boolean;
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
 * Veredictos que el backend puede mandar, mapeados a los tres que la app sabe
 * pintar. "INCIERTO" y "PENDIENTE" no estan a proposito: no son un veredicto
 * que mostrar. Con ellos se intenta deducir del puntaje, y si tampoco hay
 * puntaje el analisis falla y la persona ve un aviso de error.
 */
const VERDICT_MAP: Record<string, VerdictKey> = {
  SEGURO: 'seguro',
  SOSPECHOSO: 'sospechoso',
  MALICIOSO: 'malicioso',
};

/**
 * Puntaje neutro para cuando el backend no manda uno. No se inventa un valor
 * bajo: un falso "seguro" es el peor resultado posible del producto.
 */
const NEUTRAL_RISK_SCORE = 50;

/**
 * El puntaje que pinta el medidor, saneado.
 *
 * El medidor es una barra 0-100: un puntaje fuera de escala la dibujaria
 * desbordada (un 150 "mas que llena") o vacia de mas (un -20). Cuando el valor
 * no esta en la escala que entendemos, se usa el neutro, que es lo mismo que
 * hace `verdictFromScore` al negarse a deducir un veredicto de el: no se
 * inventa precision que no se tiene, ni hacia arriba ni hacia abajo.
 */
function usableScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < SCORE_MIN || value > SCORE_MAX) return null;
  return value;
}

/** Traduce el veredicto; lo desconocido (o ausente) da null. */
export function mapVerdict(raw: string | undefined): VerdictKey | null {
  if (!raw) return null;
  return VERDICT_MAP[raw.trim().toUpperCase()] ?? null;
}

/**
 * DESGLOSE POR FILTRO.
 *
 * El detalle tiene una seccion por filtro de la cascada —Reputacion (F1),
 * Estructura del enlace (F2.1) y Comportamiento (F2.2)— y cada una dice en
 * que estado quedo: que encontro, que no encontro, o que no corrio y por que.
 *
 * Antes las dos listas del backend se juntaban en una sola seccion, "Analisis
 * del enlace", y F1 no aparecia nunca salvo cuando cortaba. La persona veia
 * viñetas sueltas sin saber que se reviso, y un "seguro" decia "no se
 * detectaron señales" sin decir donde se busco. Un veredicto que no se puede
 * comprobar no convence, y en una app de seguridad eso es tan grave como
 * equivocarse: si la persona no le cree al "malicioso", entra igual.
 *
 * Los `detalle` del backend vienen redactados en espanol y se muestran tal
 * cual —el backend sabe por que marco lo que marco—, con dos añadidos: el
 * peso del criterio en la heuristica y la concordancia de "1 motor".
 */

/** Titulos de las tres secciones. Los mismos en todos los caminos. */
const SECTION_TITLES: Record<AnalysisStageKey, string> = {
  reputation: 'Reputación',
  heuristics: 'Estructura del enlace',
  behavior: 'Comportamiento',
};

/**
 * Corte de F2.1 en el backend: `score > 60` concluye SOSPECHOSO
 * (`qrisk-endpoint-doc.md`). Solo se usa para EXPLICAR un corte que ya hizo el
 * backend; no decide nada en la app.
 */
const BACKEND_F2_1_CUTOFF = 60;

/** Como se nombra cada tipo de amenaza de Safe Browsing en la pantalla. */
const THREAT_LABELS: Record<string, string> = {
  SOCIAL_ENGINEERING: 'phishing',
  MALWARE: 'malware',
  UNWANTED_SOFTWARE: 'software no deseado',
  POTENTIALLY_HARMFUL_APPLICATION: 'aplicación dañina',
};

function threatLabel(threatType?: string): string {
  return (threatType && THREAT_LABELS[threatType]) || 'peligrosa';
}

/**
 * "1 motores lo marcan" -> "1 motor lo marca".
 *
 * El backend redacta el recuento con el plural fijo. Se corrige solo ese caso,
 * sin tocar el resto del texto.
 */
export function fixEngineGrammar(detail: string): string {
  return detail
    .replace(/\b1 motores lo marcan\b/g, '1 motor lo marca')
    .replace(/\b1 motores\b/g, '1 motor');
}

/** "N motor(es)", con la concordancia que el backend no hace. */
function enginesText(count: number): string {
  return `${count} ${count === 1 ? 'motor' : 'motores'}`;
}

/** Texto de una señal; vacio si el backend la mando sin `detalle`. */
function detailOf(item: RemoteCriterion | undefined): string {
  return typeof item?.detalle === 'string' ? item.detalle.trim() : '';
}

/** Insignia de una seccion que si corrio: cuantas alertas encontro. */
function alertBadge(count: number): Pick<AnalysisSection, 'badgeText' | 'badgeTone'> {
  if (count === 0) return { badgeText: 'SIN ALERTAS', badgeTone: 'ok' };
  return { badgeText: `${count} ${count === 1 ? 'ALERTA' : 'ALERTAS'}`, badgeTone: 'warn' };
}

/**
 * Seccion de un filtro que no corrio porque uno anterior ya decidio.
 *
 * No es un fallo, es la cascada haciendo su trabajo, asi que va en 'ok': la
 * advertencia, si la hay, ya esta en la seccion del filtro que decidio.
 */
function notRunSection(key: AnalysisStageKey, why: string): AnalysisSection {
  return {
    key,
    title: SECTION_TITLES[key],
    badgeText: 'NO CORRIÓ',
    badgeTone: 'ok',
    findings: [{ tone: 'ok', text: why }],
  };
}

/**
 * F1 · Reputacion.
 *
 * Con `f1` (lo que de verdad consulto la app) se dice exactamente que paso:
 * lista local de confianza y Google Safe Browsing por separado, distinguiendo
 * "no la tiene reportada" de "no se pudo consultar". Sin `f1` (una respuesta
 * adaptada fuera del servicio) se dice solo lo que se puede deducir del backend.
 */
function reputationSection(
  f1: F1Outcome | undefined,
  verdict: VerdictKey,
  cutAtF1: boolean,
  domain: string,
): AnalysisSection {
  const key: AnalysisStageKey = 'reputation';
  const title = SECTION_TITLES[key];

  if (!f1) {
    if (cutAtF1 && verdict === 'malicioso') {
      return {
        key,
        title,
        badgeText: 'REPORTADA',
        badgeTone: 'warn',
        findings: [
          { tone: 'warn', text: 'Las listas de reputación la tienen reportada como peligrosa.' },
        ],
      };
    }
    if (cutAtF1 && verdict === 'seguro') {
      return {
        key,
        title,
        badgeText: 'CONFIABLE',
        badgeTone: 'ok',
        findings: [
          { tone: 'ok', text: 'El dominio está en las listas de reputación como confiable.' },
        ],
      };
    }
    return {
      key,
      title,
      badgeText: 'NO CONCLUYÓ',
      badgeTone: 'ok',
      findings: [
        {
          tone: 'ok',
          text: 'Las listas de reputación no concluyeron nada, así que el análisis siguió con los demás filtros.',
        },
      ],
    };
  }

  const findings: Finding[] = [];
  if (f1.localTrusted) {
    findings.push({ tone: 'ok', text: `${domain} está en la lista de confianza de QRisk.` });
  }

  const sb = f1.safeBrowsing;
  switch (sb.status) {
    case 'listed':
      findings.push({
        tone: 'warn',
        text: `Google Safe Browsing la tiene reportada como ${threatLabel(sb.threatType)}.`,
      });
      break;
    case 'not_listed':
      findings.push({ tone: 'ok', text: 'Google Safe Browsing no la tiene reportada.' });
      break;
    case 'unavailable':
      findings.push({
        tone: 'warn',
        text: 'No se pudo consultar Google Safe Browsing: no respondió a tiempo.',
      });
      break;
    case 'not_configured':
      findings.push({
        tone: 'warn',
        text: 'Esta versión de la app no consulta Google Safe Browsing.',
      });
      break;
  }

  const pt = f1.phishTank;
  switch (pt.status) {
    case 'listed':
      findings.push({
        tone: 'warn',
        text: 'PhishTank la tiene confirmada como phishing: su comunidad verificó el reporte.',
      });
      break;
    case 'not_listed':
      // "Confirmada" y no "registrada": PhishTank tambien guarda reportes que
      // su comunidad descarto (`valid: false`), y esos cuentan como no
      // confirmados. Ver `phishTank.ts`.
      findings.push({ tone: 'ok', text: 'PhishTank no la tiene confirmada como phishing.' });
      break;
    case 'unavailable':
      findings.push({ tone: 'warn', text: 'No se pudo consultar PhishTank: no respondió a tiempo.' });
      break;
  }

  // Cuantas listas remotas respondieron de verdad que no la tienen.
  const answered = [sb.status, pt.status].filter((status) => status === 'not_listed').length;
  const consulted = sb.status === 'not_configured' ? 1 : 2;

  let badge: Pick<AnalysisSection, 'badgeText' | 'badgeTone'>;
  if (sb.status === 'listed' || pt.status === 'listed') {
    badge = { badgeText: 'REPORTADA', badgeTone: 'warn' };
  } else if (f1.localTrusted) {
    badge = { badgeText: 'CONFIABLE', badgeTone: 'ok' };
  } else if (answered === consulted) {
    badge = { badgeText: 'SIN REPORTES', badgeTone: 'ok' };
  } else if (answered > 0) {
    badge = { badgeText: 'CONSULTA PARCIAL', badgeTone: 'warn' };
  } else {
    badge = { badgeText: 'SIN COMPLETAR', badgeTone: 'warn' };
  }

  /*
   * El backend corto en F1 aunque la app le mando INCIERTO: el veredicto salio
   * de su cache, de un analisis anterior en el que F1 si concluyo. Se dice,
   * para que la seccion no contradiga al veredicto sin explicacion.
   */
  const fromCache = cutAtF1 && f1.verdict === 'INCIERTO';

  return {
    key,
    title,
    ...badge,
    findings,
    ...(fromCache
      ? {
          footnote:
            'El veredicto viene de un análisis anterior de esta misma URL guardado en el servidor.',
        }
      : {}),
  };
}

/**
 * F2.1 · Estructura del enlace: los criterios heuristicos con su peso.
 */
function structureSection(
  cutAtF1: boolean,
  criteria: RemoteCriterion[] | undefined,
  score: number | null,
  incompleteReason: string,
): AnalysisSection {
  const key: AnalysisStageKey = 'heuristics';

  if (cutAtF1) {
    return notRunSection(key, 'No hizo falta revisarla: la reputación ya decidió el veredicto.');
  }

  // Corrio si llego la lista de criterios o, al menos, el puntaje.
  if (!Array.isArray(criteria) && score === null) {
    return incompleteSection(key, SECTION_TITLES[key], incompleteReason);
  }

  const findings: Finding[] = [];
  for (const item of criteria ?? []) {
    const detail = detailOf(item);
    if (!detail) continue;
    const weight = item.peso;
    findings.push({
      tone: 'warn',
      text:
        typeof weight === 'number' && Number.isFinite(weight) && weight > 0
          ? `${detail} · +${weight}`
          : detail,
    });
  }

  return {
    key,
    title: SECTION_TITLES[key],
    ...alertBadge(findings.length),
    findings:
      findings.length > 0
        ? findings
        : [{ tone: 'ok', text: 'Ningún criterio de riesgo se activó en la estructura del enlace.' }],
    ...(score !== null ? { footnote: `Puntaje de la estructura: ${score} de 100.` } : {}),
  };
}

/**
 * F2.2 · Comportamiento: lo que reportaron VirusTotal y URLScan.io.
 */
function behaviorSection(
  cutAtF1: boolean,
  cutAtF21: boolean,
  indicators: RemoteCriterion[] | undefined,
  incompleteReason: string,
): AnalysisSection {
  const key: AnalysisStageKey = 'behavior';

  if (cutAtF1) {
    return notRunSection(key, 'No hizo falta revisarlo: la reputación ya decidió el veredicto.');
  }
  if (cutAtF21) {
    return notRunSection(
      key,
      'No hizo falta revisarlo: la estructura del enlace ya superó el umbral de riesgo.',
    );
  }
  if (!Array.isArray(indicators)) {
    return incompleteSection(key, SECTION_TITLES[key], incompleteReason);
  }

  const findings: Finding[] = [];
  for (const item of indicators) {
    const detail = detailOf(item);
    if (detail) findings.push({ tone: 'warn', text: fixEngineGrammar(detail) });
  }

  return {
    key,
    title: SECTION_TITLES[key],
    ...alertBadge(findings.length),
    // "No llegaron reportes" y no "el sitio es limpio": una lista vacia tambien
    // puede ser que una de las dos fuentes no respondio. Se afirma solo lo que
    // se sabe.
    findings:
      findings.length > 0
        ? findings
        : [{ tone: 'ok', text: 'No llegaron reportes de riesgo de VirusTotal ni de URLScan.io.' }],
  };
}

/** Motores de VirusTotal que reporta la respuesta (el mayor, si vienen varios). */
function maliciousEngines(indicators: RemoteCriterion[] | undefined): number {
  if (!Array.isArray(indicators)) return 0;
  return indicators
    .filter((item) => (item?.indicador ?? '').trim() === 'virustotal_motores_maliciosos')
    .reduce((max, item) => Math.max(max, engineCount(detailOf(item))), 0);
}

/** Lo que necesita `verdictReason` para explicar el veredicto. */
interface ReasonContext {
  verdict: VerdictKey;
  /** El veredicto salio del puntaje porque el backend dijo PENDIENTE. */
  derivedFromScore: boolean;
  escalation: EscalationReason | null;
  cutAtF1: boolean;
  cutAtF21: boolean;
  score: number | null;
  indicators: RemoteCriterion[] | undefined;
  f1: F1Outcome | undefined;
  domain: string;
  degraded: boolean;
}

/**
 * SEGURO por la lista de confianza: dice que listas remotas confirmaron que la
 * URL no esta reportada y cuales no se pudieron consultar. Nunca afirma "no
 * reportada" por una lista que no respondio.
 */
function safeByTrustReason(domain: string, f1: F1Outcome): string {
  const sources: [string, string][] = [
    ['Google Safe Browsing', f1.safeBrowsing.status],
    ['PhishTank', f1.phishTank.status],
  ];
  const clean = sources.filter(([, status]) => status === 'not_listed').map(([name]) => name);
  const failed = sources.filter(([, status]) => status === 'unavailable').map(([name]) => name);

  let text = `Seguro: ${domain} está en la lista de confianza de QRisk`;
  if (clean.length === 2) text += ' y ni Google Safe Browsing ni PhishTank tienen reportada esta URL';
  else if (clean.length === 1) text += ` y ${clean[0]} no tiene reportada esta URL`;
  text += '.';
  if (failed.length > 0) text += ` No se pudo consultar ${failed.join(' ni ')}.`;
  return text;
}

const VERDICT_WORD: Record<VerdictKey, string> = {
  seguro: 'Seguro',
  sospechoso: 'Sospechoso',
  malicioso: 'Malicioso',
};

/**
 * "Por que este veredicto": que filtro decidio y con que umbral.
 *
 * Es la parte que hace comprobable el veredicto. Cada umbral que se nombra es
 * el que de verdad se aplico, incluidos los de la app —`verdictThresholds` y
 * `behaviorEscalation`—, que antes actuaban sin que la pantalla lo dijera:
 * cuando la app eleva lo que el backend dejo en sospechoso, aqui se dice.
 */
function verdictReason(ctx: ReasonContext): string {
  const { verdict, score, f1 } = ctx;
  const word = VERDICT_WORD[verdict];

  if (ctx.escalation) {
    const { indicator, engines } = ctx.escalation;
    const tail = ' El servidor lo había dejado en sospechoso.';
    if (indicator === 'virustotal_motores_maliciosos' && engines) {
      return `Malicioso: ${enginesText(engines)} de VirusTotal lo marcan como malicioso, y QRisk lo considera malicioso desde ${MALICIOUS_ENGINE_THRESHOLD}.${tail}`;
    }
    if (indicator === 'urlscan_scan_eliminado') {
      return `Malicioso: URLScan.io eliminó su informe después de analizar el sitio, lo que indica contenido malicioso confirmado.${tail}`;
    }
    return `Malicioso: URLScan.io analizó el sitio y concluyó que es malicioso.${tail}`;
  }

  if (ctx.cutAtF1) {
    const fresh = f1 !== undefined && f1.verdict !== 'INCIERTO';
    if (verdict === 'malicioso') {
      const reports: string[] = [];
      if (fresh && f1.safeBrowsing.status === 'listed') {
        reports.push(
          `Google Safe Browsing la tiene reportada como ${threatLabel(f1.safeBrowsing.threatType)}`,
        );
      }
      if (fresh && f1.phishTank.status === 'listed') {
        reports.push('PhishTank la tiene confirmada como phishing');
      }
      const who =
        reports.length > 0
          ? reports.join(' y ')
          : 'las listas de reputación la tienen reportada';
      return `Malicioso: ${who}. Ese reporte basta, así que no se corrieron los demás filtros.`;
    }
    if (verdict === 'seguro' && fresh && f1.localTrusted) {
      return safeByTrustReason(ctx.domain, f1);
    }
    return `${word}: lo decidieron las listas de reputación, así que no se corrieron los demás filtros.`;
  }

  if (ctx.derivedFromScore && score !== null) {
    const points = `la estructura del enlace sumó ${score} de 100 puntos`;
    if (verdict === 'malicioso') {
      return `Malicioso: ${points}, y QRisk marca malicioso desde ${VERDICT_THRESHOLDS.malicious}.`;
    }
    if (verdict === 'sospechoso') {
      return `Sospechoso: ${points}. QRisk marca sospechoso desde ${VERDICT_THRESHOLDS.suspicious} y malicioso desde ${VERDICT_THRESHOLDS.malicious}.`;
    }
    const noReports =
      Array.isArray(ctx.indicators) && ctx.indicators.length === 0
        ? ' y no llegaron reportes de VirusTotal ni de URLScan.io'
        : '';
    return `Seguro: ${points} (QRisk marca sospechoso desde ${VERDICT_THRESHOLDS.suspicious})${noReports}.`;
  }

  if (verdict === 'sospechoso' && ctx.cutAtF21) {
    return score !== null
      ? `Sospechoso: la estructura del enlace sumó ${score} de 100 puntos, por encima del corte del servidor (más de ${BACKEND_F2_1_CUTOFF}).`
      : 'Sospechoso: la estructura del enlace superó el corte de riesgo del servidor.';
  }

  if (verdict === 'sospechoso') {
    const engines = maliciousEngines(ctx.indicators);
    return engines > 0
      ? `Sospechoso: ${enginesText(engines)} de VirusTotal lo ${engines === 1 ? 'marca' : 'marcan'} como malicioso. QRisk lo considera malicioso desde ${MALICIOUS_ENGINE_THRESHOLD} motores.`
      : 'Sospechoso: el análisis de comportamiento encontró señales de riesgo, pero ninguna confirma que sea malicioso.';
  }

  return `${word}: así lo concluyó el servidor.`;
}

/**
 * Valida una seccion que manda el backend, antes de dejarla pasar a la UI.
 *
 * POR QUE VALIDAR AQUI. `sections[]` es la forma del contrato que el endpoint
 * todavia no cumple, asi que hoy no llega nunca; pero el dia que llegue, lo
 * que venga se pinta tal cual. Un `findings` que no sea arreglo revienta el
 * `.map` de la pantalla de detalle, y un `badgeTone` inesperado busca un color
 * que no existe: las dos cosas son una pantalla en blanco DESPUES de que la
 * persona escaneo algo, que es justo cuando mas necesita una respuesta.
 *
 * El criterio es el mismo que usa `isHistoryEntry` con lo que sale del disco:
 * comprobar la forma minima que las pantallas necesitan y descartar lo demas,
 * en vez de confiar en un `as`.
 */
function isRenderableSection(value: unknown): value is AnalysisSection {
  if (typeof value !== 'object' || value === null) return false;
  const section = value as Partial<AnalysisSection>;

  return (
    typeof section.key === 'string' &&
    typeof section.title === 'string' &&
    typeof section.badgeText === 'string' &&
    (section.badgeTone === 'ok' || section.badgeTone === 'warn') &&
    Array.isArray(section.findings) &&
    section.findings.every(
      (finding) =>
        typeof finding === 'object' &&
        finding !== null &&
        typeof (finding as Finding).text === 'string' &&
        ((finding as Finding).tone === 'ok' || (finding as Finding).tone === 'warn'),
    )
  );
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
 * Las secciones de los filtros ACTIVOS, marcadas como no completadas.
 *
 * Solo se rellenan las que esta version anuncia (`ENABLED_FILTERS`): el
 * contrato —nunca omitir en silencio una seccion que se anuncio— se cumple sin
 * pintar filtros que el backend ni intenta correr.
 *
 * Si se sabe que paso en F1, su seccion dice la verdad aunque el resto del
 * analisis haya fallado: la consulta a Safe Browsing la hizo el telefono y su
 * resultado no depende de que el servidor haya respondido.
 */
function placeholderSections(
  reason: string,
  verdict: VerdictKey,
  f1?: F1Outcome,
  domain = '',
): AnalysisSection[] {
  return ENABLED_FILTERS.map((key) =>
    key === 'reputation' && f1
      ? reputationSection(f1, verdict, false, domain)
      : incompleteSection(key, SECTION_TITLES[key], reason),
  );
}

/** Resumen en lenguaje llano para cada veredicto deducido del puntaje. */
const SUMMARY_BY_VERDICT: Record<VerdictKey, string> = {
  seguro: 'No encontramos señales de riesgo en este enlace.',
  // La recomendacion ("abrelo solo si confias...") la pinta aparte la
  // pantalla de resultado, en negrita: es la idea que la persona debe llevarse.
  sospechoso:
    'Encontramos señales de riesgo, pero no suficiente evidencia para confirmar que sea peligroso.',
  malicioso:
    'Este enlace es peligroso. No lo abras ni ingreses datos personales en ese sitio.',
};

/**
 * Convierte la respuesta del backend en el resultado que consumen las
 * pantallas. Tolera que falten campos: lo que no venga se completa con un
 * puntaje neutro y secciones sin completar. Lo unico que no se rellena es el
 * veredicto: sin el, lanza ApiError('INCONCLUSIVE') y la pantalla avisa.
 */
export function adaptAnalysisResponse(
  response: RemoteAnalysisResponse,
  requestedUrl: string,
  /**
   * Lo que consulto la app en F1. Opcional: sin el, la seccion de reputacion
   * dice solo lo que se puede deducir de la respuesta del backend.
   */
  f1?: F1Outcome,
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
  const concluded = mapVerdict(rawVerdict);
  const derived = concluded ? null : verdictFromScore(response.score_heuristico);
  const baseVerdict = derived ?? concluded;

  // Ni el backend ni el puntaje dan un veredicto: no se inventa uno.
  if (!baseVerdict) {
    throw new ApiError(
      'INCONCLUSIVE',
      'El servidor no concluyó un veredicto para este enlace.',
      false,
      null,
    );
  }

  /*
   * TERCERA FUENTE: la evidencia de comportamiento puede ELEVAR el veredicto.
   *
   * El backend topa en SOSPECHOSO por comportamiento, venga de donde venga la
   * señal: un sitio con 18 motores de VirusTotal marcandolo sale con la misma
   * etiqueta que uno con 2. Pero manda el recuento, asi que la app puede
   * concluir lo que el backend se queda sin decir (ver `behaviorEscalation`).
   *
   * SOLO ELEVA, NUNCA REBAJA. Si el backend ya dijo MALICIOSO, esto no cambia
   * nada; si dijo SEGURO, tampoco lo toca —un SEGURO con indicadores de
   * VirusTotal seria una contradiccion del backend, y resolverla rebajando su
   * palabra no le toca a la app—. El unico salto que hace es
   * sospechoso -> malicioso.
   */
  const escalation =
    baseVerdict === 'sospechoso' ? behaviorEscalation(response.indicadores_f2_2) : null;
  const verdict: VerdictKey = escalation ? 'malicioso' : baseVerdict;

  // Solo las secciones que la pantalla puede pintar sin romperse. Se filtra en
  // vez de confiar en el `as`: ver `isRenderableSection`.
  const validSections = Array.isArray(response.sections)
    ? response.sections.filter(isRenderableSection)
    : [];
  const criteria = response.criterios_f2_1;
  const indicators = response.indicadores_f2_2;
  const score = usableScore(response.score_heuristico);
  // Llego algo de F2.1 o de F2.2. Basta con UNA de las listas: el backend puede
  // concluir por F2.2 sin que la heuristica haya marcado nada, y al reves.
  const hasF2Data = Array.isArray(criteria) || Array.isArray(indicators) || score !== null;

  /*
   * Que filtro corto la cascada. `filtro_decisivo` lo dice; si no viene, un
   * SEGURO o MALICIOSO sin nada de F2 solo puede venir de F1, porque el backend
   * no concluye esos dos valores en ningun otro filtro (`qrisk-endpoint-doc.md`).
   */
  const decisive = (response.filtro_decisivo ?? '').trim().toUpperCase();
  const rawUpper = (rawVerdict ?? '').trim().toUpperCase();
  const cutAtF1 =
    decisive === 'F1' ||
    (!decisive && !hasF2Data && (rawUpper === 'SEGURO' || rawUpper === 'MALICIOSO'));
  const cutAtF21 = decisive === 'F2.1';

  /*
   * Las secciones salen de una de tres fuentes:
   *
   *   1. `sections[]`, si el backend algun dia cumple el contrato.
   *   2. Una por filtro, armadas desde lo que manda hoy (ver "DESGLOSE POR
   *      FILTRO"), cuando hay algo que contar: F2 respondio o F1 corto.
   *   3. Relleno "SIN COMPLETAR" cuando el analisis no llego a nada.
   */
  const incompleteReason = 'El servidor no envió el resultado de esta revisión.';
  let sections: AnalysisSection[];
  if (validSections.length > 0) {
    sections = validSections;
  } else if (hasF2Data || cutAtF1) {
    sections = [
      reputationSection(f1, verdict, cutAtF1, domain),
      structureSection(cutAtF1, criteria, score, incompleteReason),
      behaviorSection(cutAtF1, cutAtF21, indicators, incompleteReason),
    ];
  } else {
    sections = placeholderSections(
      'El análisis no se completó, así que esta parte no pudo revisarse.',
      verdict,
      f1,
      domain,
    );
  }

  /*
   * `mensaje` trae diagnostico interno ("F2.1 aun no implementado (S11)"), no
   * copy para el usuario, asi que nunca se muestra: se usa el texto que
   * corresponde al veredicto.
   */
  const summary = response.summary ?? SUMMARY_BY_VERDICT[verdict];

  /*
   * Degradado solo si el backend lo declara. Un analisis sin veredicto ya no
   * llega hasta aqui (lanza INCONCLUSIVE), y armar las secciones desde los
   * criterios no es señal de nada: el banner de "no pudimos completar todas
   * las verificaciones" saldria en analisis que si se completaron.
   */
  const degraded = response.degraded ?? false;

  // El puntaje del medidor es el de la heuristica cuando viene y esta en la
  // escala 0-100; si no, el neutro, marcado como relleno para que la pantalla
  // no lo pinte como si midiera algo.
  const meterScore = usableScore(response.riskScore) ?? score;

  const reason =
    verdictReason({
      verdict,
      derivedFromScore: derived !== null,
      escalation,
      cutAtF1,
      cutAtF21,
      score,
      indicators,
      f1,
      domain,
      degraded,
    }) +
    (response.desde_cache === true
      ? ' Resultado guardado de un análisis anterior de esta misma URL.'
      : '');

  return {
    verdict,
    domain,
    url,
    summary,
    riskScore: meterScore ?? NEUTRAL_RISK_SCORE,
    ...(meterScore === null ? { riskScoreMissing: true } : {}),
    verdictReason: reason,
    sections,
    ...(response.scanId ? { scanId: response.scanId } : {}),
    // La captura solo se incluye si vino: una clave presente con undefined
    // haria que el historial guardara un campo muerto.
    ...(response.screenshot_url ? { screenshotUrl: response.screenshot_url } : {}),
    ...(degraded ? { degraded: true } : {}),
    ...(response.pending?.length ? { pending: response.pending } : {}),
  };
}
