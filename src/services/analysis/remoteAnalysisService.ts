import { timeouts } from '../api/config';
import { ApiError } from '../api/errors';
import { postJson } from '../api/httpClient';
import { adaptAnalysisResponse, degradedResult, type RemoteAnalysisResponse } from './adaptAnalysis';
import { f1Verdict } from './f1Filter';
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

class RemoteAnalysisService implements AnalysisService {
  async analyze(url: string): Promise<AnalysisResult> {
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
      const f1 = await f1Verdict(url);

      if (__DEV__) {
        // Mismo formato que `[T_scan]`, para poder medir T_F1 en la prueba de
        // rendimiento del protocolo (100 URLs en red 4G).
        console.log(`[T_F1] ${f1.elapsedMs} ms · ${f1.verdict} · ${f1.source}`);
      }

      const response = await postJson<RemoteAnalysisResponse>(
        '/analyze',
        { url, resultadoF1: f1.verdict },
        { timeoutMs: timeouts.analyze },
      );

      return adaptAnalysisResponse(response, url);
    } catch (cause) {
      const error = cause instanceof ApiError ? cause : null;

      // Una URL que el backend rechaza no es un fallo del analisis: se deja
      // subir para que la pantalla la trate como contenido no analizable.
      if (error?.code === 'INVALID_URL') throw error;

      // Todo lo demas degrada a un veredicto honesto en vez de dejar al
      // usuario sin respuesta despues de escanear.
      return degradedResult(url, error ? reasonFor(error) : 'El análisis no pudo completarse.');
    }
  }
}

export const remoteAnalysisService: AnalysisService = new RemoteAnalysisService();
