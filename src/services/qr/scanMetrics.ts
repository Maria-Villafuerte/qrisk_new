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

/** Copia de las muestras de la sesion. */
export function getScanSamples(): ScanSample[] {
  return [...samples];
}

/** Vacia las muestras, para separar tandas de prueba. */
export function resetScanSamples(): void {
  samples.length = 0;
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

export interface ScanMetricsSummary {
  /** Lecturas correctas registradas. */
  count: number;
  medianMs: number;
  /** El valor que compara la metrica: T_scan <= 5s. */
  p90Ms: number;
  maxMs: number;
  /** Si el p90 cumple el criterio de corte de la tarea 1.4. */
  meetsTarget: boolean;
}

/**
 * Resume las muestras de la sesion. El TDR no se calcula aqui: depende de
 * cuantos QRs se presentaron y eso solo lo sabe quien hace la prueba.
 */
export function summarizeScanMetrics(): ScanMetricsSummary {
  const sorted = samples.map((sample) => sample.elapsedMs).sort((a, b) => a - b);
  const p90Ms = percentile(sorted, 0.9);

  return {
    count: sorted.length,
    medianMs: percentile(sorted, 0.5),
    p90Ms,
    maxMs: sorted.length ? sorted[sorted.length - 1] : 0,
    meetsTarget: sorted.length > 0 && p90Ms <= T_SCAN_TARGET_MS,
  };
}
