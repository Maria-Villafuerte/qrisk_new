import Constants from 'expo-constants';

/**
 * Configuracion de red.
 *
 * El valor por defecto vive en `app.json` (`expo.extra`), y se puede pisar sin
 * tocar el archivo con las variables de entorno EXPO_PUBLIC_*, que Expo
 * inyecta en el bundle al compilar.
 *
 * Ya no hay modo mock: la app corre siempre contra el backend real. El mock se
 * elimino el 2026-09-20, cuando el endpoint empezo a responder 200.
 */

interface ExtraConfig {
  apiBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

/** URL base del API, sin barra final. */
export const apiBaseUrl: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  extra.apiBaseUrl ??
  ''
).replace(/\/+$/, '');

/**
 * Topes de tiempo.
 *
 * `analyze` son 40 s y NO los 5 s que pide la metrica T_F1, por una razon
 * medida contra el backend real. Historial de la medicion:
 *
 *   2026-09-20: 5.5 s la primera llamada (Lambda en frio), 1.6-3.1 s el resto.
 *   2026-09-30: 14.2-14.5 s para una URL que el backend no haya visto antes;
 *               0.3 s si ya la tiene en cache. El salto coincide con la
 *               aparicion de F2.3 (la captura), que abre un navegador headless.
 *   2026-10-11: **24-35 s** con la cascada completa (F2.1 + F2.2 + F2.3) ya
 *               implementada. Medido: corte por F2.1 24.5 s, por F2.2 28.1 s,
 *               PENDIENTE 33.2 s. La documentacion del backend declara "hasta
 *               ~35 s" y pide configurar el cliente en 40-45 s.
 *
 * POR QUE 40 Y NO 45. Hay un techo que no depende de esta app: **API Gateway
 * corta la peticion a los 35 s y responde HTTP 504**, con la Lambda todavia
 * trabajando. Se midio el 2026-10-11: de tres URLs nuevas, una devolvio 504 a
 * los 35.2 s. Por encima de ~36 s no hay nada que esperar, porque el 504 ya
 * llego; los 40 s son margen para el viaje de red y para que el corte lo
 * decida el servidor, no el cliente.
 *
 * El tope no es la metrica: T_F1 mide lo que tarda el backend en responder, no
 * cuando la app se rinde. Cortar antes no mejora el numero, solo convierte
 * analisis buenos en inciertos: con el tope anterior de 25 s, los analisis de
 * 26-35 s —que SI completaban— se perdian por culpa del cliente.
 *
 * Si Fabi resuelve el 504 (devolver el veredicto antes que la captura, o subir
 * el limite de Gateway), hay que volver a medir y bajar esto.
 */
export const timeouts = {
  /** Corte del POST /analyze. Cubre la cascada completa; ver la nota de arriba. */
  analyze: 40_000,
  /**
   * Corte del POST /report. El endpoint no consulta APIs externas y responde
   * en ~5 s, asi que no necesita el presupuesto del analisis: un reporte que
   * tarda mas de 15 s es un fallo, y hacer esperar a la persona 40 s por un
   * formulario que ya fallo no aporta nada.
   */
  report: 15_000,
  /** T_total <= 35s para toda la cascada. */
  total: 35_000,
} as const;
