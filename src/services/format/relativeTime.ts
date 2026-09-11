/**
 * Formateo de fechas del historial.
 *
 * No usa Intl a proposito: Android trae un ICU recortado segun el dispositivo
 * y el formato que pide el diseno es fijo y en espanol. Es una funcion pura
 * con `now` inyectable para poder probar "Hoy" y "Ayer" sin depender del reloj.
 */

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

/** Dos digitos, para la hora y los minutos. */
function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Medianoche local del dia al que pertenece la fecha. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Convierte un ISO 8601 en la etiqueta del historial.
 *
 *   hoy      -> "Hoy · 12:42"
 *   ayer     -> "Ayer · 18:03"
 *   este ano -> "26 jul · 10:12"
 *   anterior -> "24 jul 2025 · 13:37"
 *
 * Si la fecha no se puede interpretar devuelve una cadena vacia: el historial
 * prefiere una fila sin fecha a reventar por un registro corrupto.
 */
export function formatScanTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDiff === 0) return `Hoy · ${time}`;
  if (dayDiff === 1) return `Ayer · ${time}`;

  const fecha = `${date.getDate()} ${MESES[date.getMonth()]}`;
  // El ano solo se muestra cuando no es el actual: en el uso normal del
  // historial (ultimos 20 escaneos) sobra, pero evita ambiguedad al revisarlo
  // mucho despues.
  const conAno = date.getFullYear() === now.getFullYear() ? fecha : `${fecha} ${date.getFullYear()}`;

  return `${conAno} · ${time}`;
}
