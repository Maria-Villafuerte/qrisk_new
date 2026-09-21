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
 * Topes de tiempo, alineados con las metricas del anteproyecto.
 *
 * `analyze` son 12 s y NO los 5 s que pide la metrica T_F1, por una razon
 * medida: el backend corre en Lambda y la primera llamada tras un rato de
 * inactividad paga el arranque en frio. Medido el 2026-09-20 sobre seis
 * llamadas seguidas: 5.5 s la primera, luego 1.6-3.1 s. Con el tope en 5 s el
 * PRIMER escaneo de una sesion se cortaba solo y degradaba a "incierto" —
 * justo el escaneo que mas se mira en una demo.
 *
 * El tope no es la metrica: T_F1 se mide sobre lo que tarda el backend en
 * responder, no sobre cuando la app se rinde. Cortar antes de tiempo no mejora
 * el numero, solo convierte analisis buenos en inciertos.
 */
export const timeouts = {
  /** Corte del POST /analyze. Cubre el arranque en frio de Lambda. */
  analyze: 12_000,
  /** T_total <= 35s para toda la cascada. */
  total: 35_000,
} as const;
