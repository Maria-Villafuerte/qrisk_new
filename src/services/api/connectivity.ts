import { apiBaseUrl } from './config';

/**
 * Cuanto se espera la comprobacion de red antes de darla por fallida. Corta a
 * proposito: sin red, `fetch` falla al instante; esto solo cubre una red que
 * no responde, y la persona esta mirando el escaner mientras tanto.
 */
const CONNECTIVITY_TIMEOUT_MS = 4_000;

/**
 * Si hay conexion con el servidor de analisis, comprobado ANTES de salir del
 * escaner: sin red, la persona se queda ahi con un aviso en vez de entrar a
 * una pantalla de carga que no puede terminar.
 *
 * Basta con que el servidor responda algo, aunque sea un 403 o un 404: lo que
 * se mide es que la peticion llegue, no la ruta. No se usa una libreria de
 * conectividad para no sumar un modulo nativo.
 */
export async function hasConnection(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);

  try {
    await fetch(apiBaseUrl, { method: 'HEAD', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
