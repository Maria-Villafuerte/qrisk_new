import { analysisMode, apiBaseUrl, timeouts } from '../config';

/**
 * La configuracion decide que implementacion corre en el dispositivo, asi que
 * el valor por defecto importa: hoy es `mock` porque el endpoint real todavia
 * responde 500 a cualquier URL valida.
 */
describe('config', () => {
  it('arranca en modo mock por defecto', () => {
    expect(analysisMode).toBe('mock');
  });

  it('expone la URL base sin barra final', () => {
    // Bajo jest, expo-constants no carga app.json, asi que el valor cae al
    // respaldo vacio en vez de romper. Lo que importa aqui es que NUNCA quede
    // con barra final: al concatenar la ruta quedaria "//analyze".
    expect(apiBaseUrl).not.toMatch(/\/$/);
    expect(typeof apiBaseUrl).toBe('string');
  });

  it('respeta los topes de las metricas', () => {
    // T_F1 <= 5s y T_total <= 35s del anteproyecto.
    expect(timeouts.analyze).toBe(5_000);
    expect(timeouts.total).toBe(35_000);
  });
});
