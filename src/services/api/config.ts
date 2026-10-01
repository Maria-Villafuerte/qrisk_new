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
 * `analyze` son 25 s y NO los 5 s que pide la metrica T_F1, por una razon
 * medida contra el backend real. Historial de la medicion:
 *
 *   2026-09-20: 5.5 s la primera llamada (Lambda en frio), 1.6-3.1 s el resto.
 *   2026-09-30: **14.2-14.5 s** para una URL que el backend no haya visto
 *               antes; 0.3 s si ya la tiene en cache. El salto coincide con la
 *               aparicion de F2.3 (la captura de pantalla), que abre un
 *               navegador headless y cuesta ~10 s.
 *
 * Con el tope en 12 s, TODO escaneo de un sitio nuevo se cortaba solo y
 * degradaba a "incierto": justo el caso normal, porque un QR interesante
 * apunta a algo que el backend no vio antes. 25 s deja casi 11 s de margen
 * sobre el peor caso medido.
 *
 * El tope no es la metrica: T_F1 mide lo que tarda el backend en responder, no
 * cuando la app se rinde. Cortar antes no mejora el numero, solo convierte
 * analisis buenos en inciertos.
 *
 * Si Fabi baja la latencia (ver README §8), hay que volver a medir y bajar
 * esto: 25 s de espera es mucho pedirle a una persona con el telefono en alto.
 */
export const timeouts = {
  /** Corte del POST /analyze. Cubre la captura de F2.3 en una URL nueva. */
  analyze: 25_000,
  /** T_total <= 35s para toda la cascada. */
  total: 35_000,
} as const;
