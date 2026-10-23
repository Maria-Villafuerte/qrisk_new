/**
 * Que pasa cuando la persona vuelve a QRisk desde segundo plano.
 *
 * Android mantiene vivo el proceso cuando se sale de la app, asi que al volver
 * el stack seguia en la ultima pantalla (un resultado, un detalle, el
 * historial). La app tiene una sola tarea principal —escanear—, asi que al
 * volver se lleva siempre al escaner. Este modulo decide CUANDO no hacerlo; el
 * componente `ReturnToScannerOnResume` es quien navega.
 */

/** Rutas en las que volver de segundo plano NO debe mover a la persona. */
export function shouldReturnToScanner(pathname: string): boolean {
  // Ya esta en el escaner, o en la redireccion de entrada.
  if (pathname === '/' || pathname === '/scanner') return false;
  // El onboarding pide permisos del sistema y puede abrir Ajustes: ambos
  // mandan la app a segundo plano y la persona tiene que volver al mismo paso.
  if (pathname.startsWith('/onboarding')) return false;
  // El analisis sigue en vuelo. Desmontar la pantalla de carga perderia el
  // veredicto y no se guardaria en el historial: se deja que termine.
  if (pathname === '/analysis/loading') return false;
  return true;
}

/**
 * Margen tras terminar una accion externa durante el que todavia se la
 * considera en curso. `Linking.openURL` resuelve en cuanto lanza el navegador,
 * a veces antes de que llegue el evento de segundo plano.
 */
export const EXTERNAL_GRACE_MS = 1500;

/** Acciones externas lanzadas por la app que todavia no terminaron. */
let pending = 0;
/** La app paso a segundo plano mientras habia una accion externa en curso. */
let leftByApp = false;

/**
 * Envuelve una accion que saca a la persona de QRisk A PROPOSITO: la galeria,
 * la camara, la hoja de compartir, el navegador. Al volver de ella hay que
 * quedarse en la misma pantalla, no saltar al escaner.
 */
export async function runExternal<T>(action: () => Promise<T>): Promise<T> {
  pending += 1;
  try {
    return await action();
  } finally {
    setTimeout(() => {
      pending -= 1;
    }, EXTERNAL_GRACE_MS);
  }
}

/** Se llama cuando la app pasa a segundo plano. */
export function noteBackground(): void {
  if (pending > 0) leftByApp = true;
}

/**
 * Se llama al volver a primer plano. Devuelve si la salida la provoco la
 * propia app, y limpia la marca para la proxima vez.
 */
export function consumeLeftByApp(): boolean {
  const value = leftByApp;
  leftByApp = false;
  return value;
}
