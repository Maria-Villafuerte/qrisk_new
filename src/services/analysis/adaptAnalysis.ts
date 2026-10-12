import { ENABLED_FILTERS } from './enabledFilters';
import type {
  AnalysisResult,
  AnalysisSection,
  AnalysisStageKey,
  Finding,
  VerdictKey,
} from './types';
import { SCORE_MAX, SCORE_MIN, verdictFromScore } from './verdictThresholds';

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
 * Convierte las señales del backend en la seccion que pinta el detalle.
 *
 * Entran LAS DOS listas que manda el endpoint:
 *
 *   - `criterios_f2_1`: la heuristica ("Host es una IP: 192.168.1.1").
 *   - `indicadores_f2_2`: el comportamiento, que hoy es VirusTotal
 *     ("18 motores lo marcan como malicioso").
 *
 * POR QUE LAS DOS EN UNA SOLA SECCION. F2.2 tiene su propia clave
 * ('behavior'), pero esta apagada en `ENABLED_FILTERS` porque el backend no
 * reporta los filtros como etapas separadas: manda una sola respuesta con
 * todo dentro. Encender 'behavior' anunciaria una etapa de carga que no
 * ocurre por separado; pero dejar los indicadores fuera tiraba a la basura la
 * evidencia MAS fuerte que produce el sistema: un sitio que 18 motores de
 * VirusTotal marcan como malicioso se veia en pantalla con una sola alerta,
 * "La URL no usa HTTPS". Mientras el backend no separe las etapas, las dos
 * listas se muestran juntas: el usuario necesita ver la señal, no saber que
 * filtro la encontro.
 *
 * Los `detalle` vienen ya redactados en espanol, asi que se muestran tal cual:
 * el backend es el que sabe por que marco lo que marco, y reescribirlo aqui
 * seria inventar.
 *
 * Solo hay dos tonos disponibles, 'ok' y 'warn' (design-system/tokens.ts): una
 * señal detectada siempre es 'warn', y la ausencia de señales es 'ok'.
 */
function sectionFromCriteria(
  criteria: RemoteCriterion[],
  indicators: RemoteCriterion[],
): AnalysisSection {
  const findings: Finding[] = [...criteria, ...indicators].map((item) => ({
    tone: 'warn',
    text: item.detalle,
  }));

  return {
    // La CLAVE sigue siendo 'reputation': es parte de `AnalysisStageKey`, un
    // tipo publico, y es la que `ENABLED_FILTERS` tiene encendida. Lo que
    // cambia es el titulo que lee el usuario, que antes prometia una consulta
    // a listas de reputacion que el backend no hace (ver `analysisStages`).
    key: 'reputation',
    title: 'Análisis del enlace',
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

/**
 * Seccion para cuando la cascada concluyo antes de producir señales.
 *
 * Pasa cuando F1 decide: el backend responde con el veredicto y nada mas,
 * porque los filtros siguientes no corrieron. La seccion dice por que no hay
 * lista de señales, en vez de dejar la impresion de que el analisis quedo a
 * medias.
 *
 * El tono sigue la regla de siempre: 'ok' solo cuando no hay nada que
 * advertir. Un MALICIOSO de F1 es la conclusion mas firme del sistema, asi que
 * va en 'warn' aunque no traiga criterios que enumerar.
 */
function earlyVerdictSection(verdict: VerdictKey, decisiveFilter?: string | null): AnalysisSection {
  const byReputation = (decisiveFilter ?? 'F1').toUpperCase() === 'F1';
  const source = byReputation
    ? 'listas de reputación'
    : `el filtro ${decisiveFilter}`;

  const safe = verdict === 'seguro';
  const text = safe
    ? `El dominio aparece en ${source} como confiable, así que el análisis terminó aquí sin necesidad de más revisiones.`
    : `El dominio aparece en ${source} como peligroso. Esa sola señal decide el veredicto, así que no se corrieron las demás revisiones.`;

  return {
    key: 'reputation',
    title: 'Análisis del enlace',
    badgeText: safe ? 'SIN ALERTAS' : 'RESUELTO POR REPUTACIÓN',
    badgeTone: safe ? 'ok' : 'warn',
    findings: [{ tone: safe ? 'ok' : 'warn', text }],
  };
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
 * Titulo de cada seccion de relleno, por clave. Se mantiene el mapa completo
 * aunque hoy solo se pinte F1: reactivar un filtro en `ENABLED_FILTERS` no debe
 * obligar a volver a escribir su titulo aqui.
 */
const PLACEHOLDER_TITLES: Record<AnalysisStageKey, string> = {
  // Mismo titulo que usa `sectionFromCriteria`, para que la seccion no cambie
  // de nombre segun si el analisis se completo o no.
  reputation: 'Análisis del enlace',
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
  // Solo las secciones que la pantalla puede pintar sin romperse. Se filtra en
  // vez de confiar en el `as`: ver `isRenderableSection`.
  const validSections = Array.isArray(response.sections)
    ? response.sections.filter(isRenderableSection)
    : [];
  const hasSections = validSections.length > 0;
  const criteria = response.criterios_f2_1;
  const indicators = response.indicadores_f2_2;
  // Basta con que llegue UNA de las dos listas: el backend puede concluir por
  // F2.2 sin que la heuristica haya marcado nada (y al reves). Si solo se
  // mirara `criterios_f2_1`, una respuesta con los indicadores de VirusTotal
  // pero sin criterios caeria en "SIN COMPLETAR" teniendo evidencia que dar.
  const hasCriteria = Array.isArray(criteria) || Array.isArray(indicators);

  let sections: AnalysisSection[];
  if (hasSections) {
    sections = validSections;
  } else if (hasCriteria) {
    sections = [sectionFromCriteria(criteria ?? [], indicators ?? [])];
  } else if (backendConcluded(rawVerdict)) {
    /*
     * CORTE ANTICIPADO DE LA CASCADA, no un fallo.
     *
     * Cuando F1 resuelve (`filtro_decisivo: "F1"`), el backend responde solo
     * con el veredicto: no hay criterios ni indicadores porque los filtros
     * caros no llegaron a correr. Eso es exactamente lo que la cascada busca.
     *
     * Antes se caia en `placeholderSections`, que pinta "SIN COMPLETAR" y dice
     * "esta parte no pudo revisarse": leer eso en un sitio que el backend
     * declaro SEGURO es desconcertante, y en uno que declaro MALICIOSO es peor,
     * porque sugiere que la condena es dudosa cuando es la mas firme que el
     * sistema puede emitir. Se explica lo que de verdad paso.
     */
    sections = [earlyVerdictSection(verdict, response.filtro_decisivo)];
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
    // El puntaje del medidor es el de la heuristica cuando viene y esta en la
    // escala 0-100; si no, el neutro, que no miente hacia ningun lado.
    riskScore:
      usableScore(response.riskScore) ??
      usableScore(response.score_heuristico) ??
      NEUTRAL_RISK_SCORE,
    sections,
    ...(response.scanId ? { scanId: response.scanId } : {}),
    // La captura solo se incluye si vino: una clave presente con undefined
    // haria que el historial guardara un campo muerto.
    ...(response.screenshot_url ? { screenshotUrl: response.screenshot_url } : {}),
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
