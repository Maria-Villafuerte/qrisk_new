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

  it('da margen a lo que de verdad tarda el backend', () => {
    // Medido el 2026-09-30 contra el endpoint real: 14.2-14.5 s para una URL
    // que el backend no haya visto antes (la captura de F2.3 abre un navegador
    // headless), 0.3 s si ya esta en cache. Con el tope en 12 s, TODO escaneo
    // de un sitio nuevo se cortaba y degradaba a "incierto".
    //
    // No bajar de aqui sin volver a medir con una URL nueva: una URL repetida
    // responde desde cache y da un numero enganosamente bueno.
    expect(timeouts.analyze).toBeGreaterThanOrEqual(20_000);
  });

  it('respeta el tope total del anteproyecto', () => {
    // T_total <= 35s.
    expect(timeouts.total).toBe(35_000);
  });
});
