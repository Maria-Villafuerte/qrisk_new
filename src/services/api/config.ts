import Constants from 'expo-constants';

/**
 * Configuracion de red. Un solo lugar para cambiar mock <-> real.
 *
 * El valor por defecto vive en `app.json` (`expo.extra`), y se puede pisar sin
 * tocar el archivo con las variables de entorno EXPO_PUBLIC_*, que Expo
 * inyecta en el bundle al compilar.
 */

/** De donde sale el veredicto: del mock local o del backend. */
export type AnalysisMode = 'mock' | 'remote';

interface ExtraConfig {
  analysisMode?: string;
  apiBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

/**
 * Modo activo. Hoy el default es `mock` porque el endpoint real todavia
 * responde 500 a cualquier URL valida; ver README.
 */
export const analysisMode: AnalysisMode =
  (process.env.EXPO_PUBLIC_ANALYSIS_MODE ?? extra.analysisMode) === 'remote' ? 'remote' : 'mock';

/** URL base del API, sin barra final. */
export const apiBaseUrl: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  extra.apiBaseUrl ??
  ''
).replace(/\/+$/, '');

/**
 * Topes de tiempo, alineados con las metricas del anteproyecto.
 * El endpoint real hoy se cuelga ~16s antes de fallar, asi que sin estos
 * cortes el usuario esperaria todo ese rato mirando la pantalla de carga.
 */
export const timeouts = {
  /** T_F1 <= 5s. */
  analyze: 5_000,
  /** T_total <= 35s para toda la cascada. */
  total: 35_000,
} as const;
