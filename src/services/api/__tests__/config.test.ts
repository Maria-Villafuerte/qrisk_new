import { apiBaseUrl, timeouts } from '../config';

/**
 * La configuracion decide contra que endpoint corre la app y cuanto espera.
 * Ya no hay modo mock: la unica implementacion es la real.
 */
describe('config', () => {
  it('expone la URL base sin barra final', () => {
    // Bajo jest, expo-constants no carga app.json, asi que el valor cae al
    // respaldo vacio en vez de romper. Lo que importa aqui es que NUNCA quede
    // con barra final: al concatenar la ruta quedaria "//analyze".
    expect(apiBaseUrl).not.toMatch(/\/$/);
    expect(typeof apiBaseUrl).toBe('string');
  });

  it('el analisis tiene un presupuesto de 90 s, reintento incluido', () => {
    // Decision del 2026-10-12. Ver la nota de `timeouts` en config.ts.
    expect(timeouts.analyze).toBe(90_000);
  });

  it('solo reintenta si queda tiempo para que el reintento complete', () => {
    // Los reintentos que completaron tardaron 26.7-30.9 s (medido 2026-10-12).
    expect(timeouts.analyzeRetryMinMs).toBeGreaterThanOrEqual(26_700);
    expect(timeouts.analyzeRetryMinMs).toBeLessThan(timeouts.analyze);
  });

  it('respeta el tope total del anteproyecto', () => {
    // T_total <= 35s.
    expect(timeouts.total).toBe(35_000);
  });
});
