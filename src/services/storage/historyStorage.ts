import Storage from 'expo-sqlite/kv-store';
import type { AnalysisResult, ScanRecord } from '../analysis/types';

/**
 * Persistencia del historial en el dispositivo.
 *
 * La metrica pide "historial offline: 100% recuperable sin conexion", asi que
 * el telefono es la fuente de verdad, no el servidor. Se usa el kv-store de
 * expo-sqlite porque expone una API SINCRONA (`getItemSync`): con eso el
 * historial ya esta en el primer render y no hay parpadeo de "no hay nada".
 */

/** Clave unica. Lleva version para poder migrar el formato sin romper. */
const HISTORY_KEY = 'qrisk.history.v1';

/** Tope del historial. El mas viejo se descarta al pasarse. */
export const HISTORY_LIMIT = 20;

/**
 * Una entrada guardada: el resumen que pinta la lista mas el analisis
 * completo, para poder reabrirlo sin red ni volver a consultar al backend.
 */
export interface HistoryEntry {
  record: ScanRecord;
  analysis: AnalysisResult;
}

/**
 * Lee el historial. Ante cualquier dato corrupto devuelve una lista vacia en
 * vez de propagar el error: un registro malo no puede dejar la app inservible.
 */
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = Storage.getItemSync(HISTORY_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Guarda la lista completa, recortada al tope. Es sincrona a proposito: el
 * volumen es de 20 registros y asi el llamador no tiene que orquestar nada.
 */
export function saveHistory(entries: HistoryEntry[]): void {
  try {
    Storage.setItemSync(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // Quedarse sin espacio no puede tumbar un escaneo en curso: el historial
    // es informacion secundaria frente al veredicto que el usuario esta viendo.
  }
}

/**
 * Quita del analisis lo que no sobrevive al paso del tiempo.
 *
 * Hoy solo `screenshotUrl`: es una URL firmada de S3 que caduca en una hora,
 * asi que guardarla llena el disco de enlaces que naceran muertos. La pantalla
 * de detalle ya oculta la imagen si falla al cargar, pero mas vale no guardar
 * basura que depender de ese rescate.
 */
function withoutExpiring(analysis: AnalysisResult): AnalysisResult {
  if (!analysis.screenshotUrl) return analysis;
  const { screenshotUrl: _omitted, ...rest } = analysis;
  return rest;
}

/**
 * Agrega un escaneo al frente y devuelve la lista resultante, SIN tocar el
 * disco. El mas reciente primero, que es el orden en que se pinta.
 *
 * Existe separada de `appendScan` para que quien la llame pueda calcular la
 * lista nueva dentro de un updater de `setState` —donde React puede invocar la
 * funcion mas de una vez— y escribir a disco una sola vez, fuera. Es pura: dos
 * invocaciones con los mismos argumentos dan el mismo resultado y no tienen
 * ningun efecto.
 */
export function withScanAppended(
  entries: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  const stored: HistoryEntry = { ...entry, analysis: withoutExpiring(entry.analysis) };
  return [stored, ...entries].slice(0, HISTORY_LIMIT);
}

/**
 * Agrega un escaneo al frente, lo persiste y devuelve la lista resultante.
 *
 * Hace las dos cosas a la vez, asi que NO sirve dentro de un updater de
 * `setState`: ahi la escritura se repetiria con cada invocacion. Para ese caso
 * esta `withScanAppended` + `saveHistory` por separado.
 */
export function appendScan(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = withScanAppended(entries, entry);
  saveHistory(next);
  return next;
}

/** Vacia el historial. */
export function clearHistory(): void {
  try {
    Storage.removeItemSync(HISTORY_KEY);
  } catch {
    // Nada que hacer: si no se pudo borrar, la proxima lectura sigue devolviendo
    // lo que haya y el usuario puede reintentar.
  }
}

/**
 * Validacion defensiva de lo que sale del disco. Solo comprueba la forma
 * minima que las pantallas necesitan; un registro incompleto se descarta.
 */
function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;

  const entry = value as { record?: unknown; analysis?: unknown };
  const record = entry.record as Partial<ScanRecord> | undefined;
  const analysis = entry.analysis as Partial<AnalysisResult> | undefined;

  return (
    typeof record?.id === 'string' &&
    typeof record.domain === 'string' &&
    typeof record.verdict === 'string' &&
    typeof record.scannedAt === 'string' &&
    (record.place === null || typeof record.place === 'string') &&
    typeof analysis?.verdict === 'string' &&
    Array.isArray(analysis.sections)
  );
}
