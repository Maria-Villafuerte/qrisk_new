import type { VerdictKey } from './types';

/**
 * Las dos metricas de deteccion del anteproyecto, calculadas sobre una muestra.
 *
 * POR QUE DOS Y NO UNA. El anteproyecto define TDM como "% de URLs maliciosas
 * verificadas que reciben veredicto MALICIOSO" (criterio >= 90 %). Medida al
 * pie de la letra, esa definicion arroja un numero que dice mas del umbral del
 * backend que de la capacidad de deteccion del sistema:
 *
 *   - F2.1 topa en SOSPECHOSO por diseño del backend (`score > 60` solo
 *     concluye SOSPECHOSO, ni con score 95).
 *   - F2.2 tambien topaba, hasta que la app empezo a elevar con evidencia
 *     fuerte (`behaviorEscalation`).
 *   - F1 solo conoce lo que esta en las listas que consulta.
 *
 * Asi que una URL que el sistema SI detecta —la advierte, muestra la evidencia
 * y le pone friccion para abrirla— puede contar como fallo de TDM solo porque
 * la etiqueta dice "sospechoso".
 *
 * Para la persona que escaneo el QR, "sospechoso" y "malicioso" llevan a la
 * misma decision: no entrar. La diferencia de etiqueta es interna del sistema.
 * Medir solo TDM estricta oculta eso; medir solo la tasa de advertencia oculta
 * el techo del umbral. Se reportan las dos.
 */

/** Un caso medido de la muestra. */
export interface DetectionSample {
  url: string;
  /** Lo que la app concluyo. */
  verdict: VerdictKey;
}

export interface DetectionMetrics {
  /** Casos evaluados. */
  total: number;
  /** Casos con veredicto 'malicioso'. */
  malicious: number;
  /** Casos con veredicto 'sospechoso'. */
  suspicious: number;
  /** Casos con veredicto 'seguro'. */
  safe: number;
  /**
   * TDM estricta: % que recibio 'malicioso'.
   * Es la definicion literal del anteproyecto. Criterio >= 90 %.
   */
  strictTdmPct: number;
  /**
   * Tasa de advertencia: % que recibio 'malicioso' O 'sospechoso'.
   * Mide si el sistema advirtio a la persona, que es su proposito.
   */
  warningRatePct: number;
  /**
   * Tasa de falsos negativos: % de URLs maliciosas que salieron 'seguro'.
   * Es el error GRAVE de una app de seguridad, mas que un "sospechoso" de
   * menos: un falso 'seguro' invita a entrar.
   */
  falseNegativePct: number;
}

/** Redondea a un decimal, que es la precision que tienen muestras de 50. */
function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Calcula las metricas sobre una muestra de URLs MALICIOSAS conocidas.
 *
 * Para la muestra de URLs legitimas (falsos positivos) se usa
 * `falsePositiveMetrics`, que mide lo contrario.
 */
export function detectionMetrics(samples: DetectionSample[]): DetectionMetrics {
  const total = samples.length;
  const malicious = samples.filter((s) => s.verdict === 'malicioso').length;
  const suspicious = samples.filter((s) => s.verdict === 'sospechoso').length;
  const safe = samples.filter((s) => s.verdict === 'seguro').length;

  return {
    total,
    malicious,
    suspicious,
    safe,
    strictTdmPct: pct(malicious, total),
    warningRatePct: pct(malicious + suspicious, total),
    falseNegativePct: pct(safe, total),
  };
}

export interface FalsePositiveMetrics {
  total: number;
  /** Legitimas marcadas 'malicioso'. Es la TFP del anteproyecto. */
  flaggedMalicious: number;
  /** Legitimas marcadas 'sospechoso'. No cuenta para la TFP, pero informa. */
  flaggedSuspicious: number;
  /** Legitimas con veredicto 'seguro': el resultado correcto. */
  safe: number;
  /**
   * TFP del anteproyecto: % de legitimas con veredicto 'malicioso'.
   * Criterio <= 5 %.
   */
  strictFprPct: number;
  /**
   * % de legitimas con CUALQUIER advertencia ('malicioso' o 'sospechoso').
   * No es la metrica del anteproyecto, pero es la friccion real que sufre una
   * persona navegando sitios legitimos, asi que vale reportarla al lado.
   */
  anyWarningPct: number;
}

/**
 * Calcula los falsos positivos sobre una muestra de URLs LEGITIMAS.
 *
 * El anteproyecto define TFP como "% de URLs legitimas que reciben veredicto
 * MALICIOSO" —solo malicioso—, asi que un 'sospechoso' sobre un sitio legitimo
 * NO cuenta para la metrica. Se cuenta igual y se reporta aparte: es friccion
 * que la persona si percibe.
 */
export function falsePositiveMetrics(samples: DetectionSample[]): FalsePositiveMetrics {
  const total = samples.length;
  const flaggedMalicious = samples.filter((s) => s.verdict === 'malicioso').length;
  const flaggedSuspicious = samples.filter((s) => s.verdict === 'sospechoso').length;
  const safe = samples.filter((s) => s.verdict === 'seguro').length;

  return {
    total,
    flaggedMalicious,
    flaggedSuspicious,
    safe,
    strictFprPct: pct(flaggedMalicious, total),
    anyWarningPct: pct(flaggedMalicious + flaggedSuspicious, total),
  };
}

/**
 * Precision, exhaustividad y F1 sobre las dos muestras juntas.
 *
 * El anteproyecto los pide explicitamente ("calculo de precision, recall y
 * F1-score"). Se calculan tratando como POSITIVO cualquier advertencia
 * ('malicioso' o 'sospechoso'), no solo 'malicioso', por la misma razon de
 * arriba: la app cumplio su proposito si advirtio.
 *
 * Se reporta junto con la version estricta para que se vea el efecto del
 * umbral.
 */
export interface ClassificationScores {
  /** De lo que la app advirtio, cuanto era de verdad malicioso. */
  precision: number;
  /** De lo malicioso que habia, cuanto advirtio la app. */
  recall: number;
  /** Media armonica de las dos. */
  f1: number;
}

function scores(tp: number, fp: number, fn: number): ClassificationScores {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const round = (v: number) => Math.round(v * 1000) / 1000;
  return { precision: round(precision), recall: round(recall), f1: round(f1) };
}

/**
 * Las dos versiones de precision/recall/F1.
 *
 * `strict` cuenta como positivo solo 'malicioso'; `warning` cuenta tambien
 * 'sospechoso'. La diferencia entre ambas es, numericamente, el costo del
 * techo del umbral del backend.
 */
export function classificationScores(
  maliciousSamples: DetectionSample[],
  legitimateSamples: DetectionSample[],
): { strict: ClassificationScores; warning: ClassificationScores } {
  const isWarning = (v: VerdictKey) => v === 'malicioso' || v === 'sospechoso';

  return {
    strict: scores(
      maliciousSamples.filter((s) => s.verdict === 'malicioso').length,
      legitimateSamples.filter((s) => s.verdict === 'malicioso').length,
      maliciousSamples.filter((s) => s.verdict !== 'malicioso').length,
    ),
    warning: scores(
      maliciousSamples.filter((s) => isWarning(s.verdict)).length,
      legitimateSamples.filter((s) => isWarning(s.verdict)).length,
      maliciousSamples.filter((s) => !isWarning(s.verdict)).length,
    ),
  };
}
