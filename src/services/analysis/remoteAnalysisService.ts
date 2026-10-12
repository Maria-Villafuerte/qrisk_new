import { ApiError } from '../api/errors';
import { timeouts } from '../api/config';
import { postJson } from '../api/httpClient';
import { adaptAnalysisResponse, degradedResult, type RemoteAnalysisResponse } from './adaptAnalysis';
import { f1Verdict, type F1Outcome } from './f1Filter';
import type { AnalysisResult, AnalysisService } from './types';

/**
 * Implementacion real de AnalysisService contra el backend.
 *
 * Cumple la misma interfaz que el mock, asi que cambiar de uno a otro no
 * obliga a tocar ninguna pantalla.
 */

/** Motivo legible para el usuario, segun por que fallo el analisis. */
function reasonFor(error: ApiError): string {
  switch (error.code) {
    case 'TIMEOUT':
      return 'El servidor tardó demasiado en responder durante el análisis.';
    /*
     * HTTP 504 de API Gateway: el servidor corta a los 35 s mientras la
     * cascada sigue trabajando. Medido el 2026-10-12 en casi toda URL nueva.
     * Antes caia en el mensaje generico ("no respondio correctamente"), que
     * hacia parecer un fallo de la app lo que es un limite de tiempo del
     * servidor.
     */
    case 'FILTER_TIMEOUT':
      return 'El servidor tardó demasiado en analizar el enlace y cortó la respuesta.';
    case 'NETWORK':
      return 'No hubo conexión para completar esta parte del análisis.';
    case 'RATE_LIMITED':
      return 'Se alcanzó el límite de consultas; intenta de nuevo en un momento.';
    case 'CANCELLED':
      return 'El análisis se canceló antes de terminar.';
    default:
      return 'El servicio de análisis no respondió correctamente.';
  }
}

/**
 * POST /analyze con presupuesto de 90 s y UN reintento tras un 504.
 *
 * Solo se reintenta ante `FILTER_TIMEOUT` (el 504 de API Gateway a los 35 s):
 * es el unico fallo en el que la segunda consulta puede salir mejor, porque
 * VirusTotal y URLScan ya analizaron la URL en el primer intento. Un 500, una
 * falta de red o un 429 no mejoran por insistir. Ver la nota de `timeouts`.
 *
 * El segundo intento usa como tope lo que reste del presupuesto, asi que la
 * espera total nunca pasa de `timeouts.analyze`.
 */
async function analyzeWithRetry(
  url: string,
  resultadoF1: F1Outcome['verdict'],
): Promise<RemoteAnalysisResponse> {
  const deadline = Date.now() + timeouts.analyze;
  const attempt = () =>
    postJson<RemoteAnalysisResponse>(
      '/analyze',
      { url, resultadoF1 },
      { timeoutMs: Math.max(1, deadline - Date.now()) },
    );

  try {
    return await attempt();
  } catch (cause) {
    const gatewayTimeout = cause instanceof ApiError && cause.code === 'FILTER_TIMEOUT';
    const remaining = deadline - Date.now();
    if (!gatewayTimeout || remaining < timeouts.analyzeRetryMinMs) throw cause;

    if (__DEV__) {
      console.log(`[analyze] 504 del servidor; reintento con ${Math.round(remaining / 1000)} s`);
    }
    return attempt();
  }
}

class RemoteAnalysisService implements AnalysisService {
  async analyze(url: string): Promise<AnalysisResult> {
    // Fuera del `try` para que el resultado degradado tambien pueda contar lo
    // que F1 alcanzo a consultar. `f1Verdict` no lanza nunca.
    let f1: F1Outcome | undefined;
    try {
      /*
       * `resultadoF1` es el resultado del primer filtro de la cascada, y el
       * contrato espera que lo mande el cliente: con SEGURO o MALICIOSO el
       * backend corta de inmediato (~5 s medidos) en vez de correr la cascada
       * completa (24-35 s).
       *
       * F1 es el Objetivo Especifico 4 del protocolo y vive en la app: consulta
       * la lista local de dominios confiables y Google Safe Browsing. Ver
       * `f1Filter.ts` para el orden en que se consultan y por que.
       */
      f1 = await f1Verdict(url);

      if (__DEV__) {
        // Mismo formato que `[T_scan]`, para poder medir T_F1 en la prueba de
        // rendimiento del protocolo (100 URLs en red 4G).
        console.log(`[T_F1] ${f1.elapsedMs} ms · ${f1.verdict} · ${f1.source}`);
      }

      const response = await analyzeWithRetry(url, f1.verdict);

      return adaptAnalysisResponse(response, url, f1);
    } catch (cause) {
      const error = cause instanceof ApiError ? cause : null;

      // Una URL que el backend rechaza no es un fallo del analisis: se deja
      // subir para que la pantalla la trate como contenido no analizable.
      if (error?.code === 'INVALID_URL') throw error;

      // Todo lo demas degrada a un veredicto honesto en vez de dejar al
      // usuario sin respuesta despues de escanear.
      return degradedResult(url, error ? reasonFor(error) : 'El análisis no pudo completarse.', f1);
    }
  }
}

export const remoteAnalysisService: AnalysisService = new RemoteAnalysisService();
