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

  it('da margen al arranque en frio del backend', () => {
    // Medido el 2026-09-20 sobre seis llamadas seguidas al endpoint real: 5.5 s
    // la primera (Lambda arrancando en frio), 1.6-3.1 s las siguientes. Con el
    // tope en 5 s el PRIMER escaneo de cada sesion se cortaba solo y degradaba
    // a "incierto". No bajar de aqui sin volver a medir.
    expect(timeouts.analyze).toBeGreaterThanOrEqual(10_000);
  });

  it('respeta el tope total del anteproyecto', () => {
    // T_total <= 35s.
    expect(timeouts.total).toBe(35_000);
  });
});
