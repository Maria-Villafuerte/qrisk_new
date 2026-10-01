import { Platform } from 'react-native';

/**
 * Instrumentacion de la metrica T_scan: tiempo desde que el escaner queda
 * listo hasta que la camara entrega un codigo.
 *
 * Vive aparte de la pantalla para que la tarea 1.4 (medicion en dispositivo
 * real) no obligue a tocar la UI, y para poder leer las muestras desde la
 * consola de Metro durante la prueba de los 30 QRs.
 */

/** Una lectura correcta, con lo que hace falta para el analisis posterior. */
export interface ScanSample {
  /** Milisegundos entre pantalla lista y deteccion. */
  elapsedMs: number;
  /** Cuando se detecto, en ISO 8601. */
  at: string;
  /** Primeros caracteres del contenido, para identificar el QR en la tabla. */
  preview: string;
}

/** Tope de la metrica del anteproyecto: T_scan <= 5s en el percentil 90. */
export const T_SCAN_TARGET_MS = 5000;

/** Muestras de la sesion. No se persisten: la prueba 1.4 es de una sentada. */
const samples: ScanSample[] = [];

/**
 * QRs que se presentaron a la camara y NO se pudieron leer.
 *
 * El TDR es detectados / presentados, asi que sin este contador la metrica
 * habria que llevarla a mano en papel mientras se escanean 30 codigos. Lo
 * registra quien hace la prueba, con `markScanFailed()`, porque la app no
 * puede saber que hubo un QR enfrente si nunca lo decodifico.
 */
let failedCount = 0;

let startedAt: number | null = null;

/** Arranca el cronometro. Lo llama el escaner cada vez que queda listo. */
export function markScanStarted(): void {
  startedAt = Date.now();
}

/**
 * Cierra el cronometro y guarda la muestra. Devuelve el tiempo medido, o
 * null si no habia una medicion abierta.
 */
export function markScanDetected(data: string): number | null {
  if (startedAt == null) return null;

  const elapsedMs = Date.now() - startedAt;
  startedAt = null;

  const sample: ScanSample = {
    elapsedMs,
    at: new Date().toISOString(),
    preview: data.slice(0, 40),
  };
  samples.push(sample);

  if (__DEV__) {
    // Sale en la consola de Metro: es la lectura que se anota en la tabla
    // de la prueba en dispositivo.
    const flag = elapsedMs <= T_SCAN_TARGET_MS ? 'OK' : 'FUERA DE METRICA';
    console.log(
      `[T_scan] ${elapsedMs} ms · ${flag} · muestra ${samples.length} · ${Platform.OS}`,
    );
  }

  return elapsedMs;
}

/**
 * Registra un QR que se presento y no se pudo leer. Lo llama quien corre la
 * prueba 1.4 desde el depurador, cuando se rinde con un codigo.
 *
 * `after` permite anotar varios de golpe si se conto a mano: por ejemplo
 * `markScanFailed(3)` al final de una tanda.
 */
export function markScanFailed(count = 1): void {
  failedCount += Math.max(0, Math.trunc(count));

  // REARRANCA el cronometro, no lo cancela. Es la diferencia entre medir y no
  // medir: durante la prueba 1.4 no se sale del escaner entre codigo y codigo,
  // y `markScanStarted()` solo corre cuando la pantalla recupera el foco. Si
  // aqui se dejara en null, la siguiente lectura buena devolveria null y la
  // muestra se perderia en silencio.
  //
  // Y tiene que ser un reinicio, no dejarlo correr: el tiempo que se paso
  // peleando con el QR fallido no es parte de la lectura siguiente.
  startedAt = Date.now();
}

/** Copia de las muestras de la sesion. */
export function getScanSamples(): ScanSample[] {
  return [...samples];
}

/** Vacia las muestras, para separar tandas de prueba. */
export function resetScanSamples(): void {
  samples.length = 0;
  failedCount = 0;
  startedAt = null;
}

/** Percentil por interpolacion lineal, sobre una lista ya ordenada. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

/** Tope de la metrica del anteproyecto: TDR >= 95%. */
export const TDR_TARGET_PCT = 95;

export interface ScanMetricsSummary {
  /** Lecturas correctas registradas. */
  count: number;
  medianMs: number;
  /** El valor que compara la metrica: T_scan <= 5s. */
  p90Ms: number;
  maxMs: number;
  /** Si el p90 cumple el criterio de corte de la tarea 1.4. */
  meetsTarget: boolean;
  /** QRs que se presentaron y no se pudieron leer (`markScanFailed`). */
  failed: number;
  /** Leidos + fallidos. Es el denominador del TDR. */
  presented: number;
  /** Tasa de deteccion, 0-100 con un decimal. 0 si no se presento nada. */
  tdrPct: number;
  /** Si el TDR cumple el criterio de >= 95%. */
  meetsTdr: boolean;
}

/**
 * Resume las muestras de la sesion: las dos metricas de la prueba 1.4 de una
 * sola llamada, para no tener que calcular nada a mano con el telefono en la
 * otra mano.
 *
 * El TDR solo sale bien si los fallos se fueron anotando con
 * `markScanFailed()`: la app no puede saber que hubo un QR enfrente si nunca
 * llego a decodificarlo. Sin anotarlos, `tdrPct` da 100% y miente.
 */
export function summarizeScanMetrics(): ScanMetricsSummary {
  const sorted = samples.map((sample) => sample.elapsedMs).sort((a, b) => a - b);
  const p90Ms = percentile(sorted, 0.9);

  const presented = sorted.length + failedCount;
  // Se redondea a un decimal: 29/30 es 96.666…%, y en la tabla de la prueba
  // se anota 96.7%.
  const tdrPct = presented === 0 ? 0 : Math.round((sorted.length / presented) * 1000) / 10;

  return {
    count: sorted.length,
    medianMs: percentile(sorted, 0.5),
    p90Ms,
    maxMs: sorted.length ? sorted[sorted.length - 1] : 0,
    meetsTarget: sorted.length > 0 && p90Ms <= T_SCAN_TARGET_MS,
    failed: failedCount,
    presented,
    tdrPct,
    meetsTdr: presented > 0 && tdrPct >= TDR_TARGET_PCT,
  };
}
