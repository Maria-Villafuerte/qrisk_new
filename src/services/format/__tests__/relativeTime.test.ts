import { formatScanTime } from '../relativeTime';

/**
 * El historial guarda ISO 8601 y formatea al pintar: "Hoy" se rompe en cuanto
 * cambia el dia, asi que la fecha no puede venir ya formateada del backend.
 */
describe('formatScanTime', () => {
  // 9 de septiembre de 2026, 15:30 hora local.
  const now = new Date(2026, 8, 9, 15, 30, 0);
  const at = (y: number, m: number, d: number, h: number, min: number) =>
    new Date(y, m, d, h, min, 0).toISOString();

  it('dice "Hoy" con la hora', () => {
    expect(formatScanTime(at(2026, 8, 9, 12, 42), now)).toBe('Hoy · 12:42');
  });

  it('rellena la hora a dos digitos', () => {
    expect(formatScanTime(at(2026, 8, 9, 9, 5), now)).toBe('Hoy · 09:05');
    expect(formatScanTime(at(2026, 8, 9, 0, 0), now)).toBe('Hoy · 00:00');
  });

  it('dice "Ayer" el dia anterior', () => {
    expect(formatScanTime(at(2026, 8, 8, 18, 3), now)).toBe('Ayer · 18:03');
    expect(formatScanTime(at(2026, 8, 8, 23, 59), now)).toBe('Ayer · 23:59');
  });

  it('usa dia y mes dentro del mismo ano', () => {
    expect(formatScanTime(at(2026, 6, 26, 10, 12), now)).toBe('26 jul · 10:12');
  });

  it('agrega el ano cuando no es el actual', () => {
    expect(formatScanTime(at(2025, 6, 24, 13, 37), now)).toBe('24 jul 2025 · 13:37');
  });

  it('cuenta dias, no horas: 23:59 de ayer sigue siendo "Ayer"', () => {
    // Con una resta de milisegundos esto diria "Hoy": el corte es la medianoche.
    const casiMedianoche = new Date(2026, 8, 10, 0, 30, 0);
    expect(formatScanTime(at(2026, 8, 9, 23, 59), casiMedianoche)).toBe('Ayer · 23:59');
  });

  it('resuelve el cruce de mes y de ano', () => {
    expect(formatScanTime(at(2026, 7, 31, 20, 0), new Date(2026, 8, 1, 10, 0, 0))).toBe(
      'Ayer · 20:00',
    );
    expect(formatScanTime(at(2025, 11, 31, 20, 0), new Date(2026, 0, 1, 10, 0, 0))).toBe(
      'Ayer · 20:00',
    );
  });

  it('devuelve vacio si la fecha no se puede interpretar', () => {
    // Un registro corrupto deja la fila sin fecha, pero no tumba el historial.
    expect(formatScanTime('no-es-fecha', now)).toBe('');
    expect(formatScanTime('', now)).toBe('');
  });
});
