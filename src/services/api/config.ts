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
 * POST /analyze: PRESUPUESTO DE 90 s CON UN REINTENTO (desde el 2026-10-12).
 *
 * Historial de lo que tarda el backend, medido contra el endpoint real:
 *
 *   2026-09-20: 5.5 s la primera llamada (Lambda en frio), 1.6-3.1 s el resto.
 *   2026-09-30: 14.2-14.5 s para una URL nueva; 0.3 s si ya esta en cache.
 *   2026-10-11: 24-35 s con la cascada completa (F2.1 + F2.2 + F2.3).
 *   2026-10-12: casi toda URL nueva da 504 a los 35 s. La cache no acierta.
 *
 * EL TECHO NO ES DE LA APP. API Gateway corta cada peticion a los 35 s y
 * responde HTTP 504, con la Lambda todavia trabajando. La cascada tarda
 * alrededor de esos mismos 35 s, asi que a veces entra y a veces no.
 *
 * POR QUE UN REINTENTO. Medido el 2026-10-12: tras un 504, la segunda consulta
 * de la misma URL puede ser mas rapida (26.7 y 30.9 s), porque VirusTotal y
 * URLScan ya la analizaron en el primer intento. Rescato 1 de 3 URLs nuevas,
 * asi que ayuda pero NO resuelve el problema: eso le toca al backend (subir el
 * limite de Gateway o usar una Lambda Function URL). Cada reintento gasta
 * cuota de VirusTotal del backend.
 *
 * El presupuesto acota la espera total del analisis en el servidor: el
 * reintento solo se lanza si queda tiempo para que pueda completar
 * (`analyzeRetryMinMs`), y su propio tope es lo que reste de los 90 s.
 *
 * El tope del reporte es aparte: un formulario corto no espera tanto.
 */
export const timeouts = {
  /** Espera maxima total de POST /analyze, sumando el reintento. */
  analyze: 90_000,
  /**
   * Tiempo minimo que tiene que quedar del presupuesto para reintentar tras un
   * 504. Los reintentos que completaron tardaron 26.7-30.9 s; con menos de 30 s
   * el reintento casi seguro no alcanzaria y solo gastaria cuota.
   */
  analyzeRetryMinMs: 30_000,
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
