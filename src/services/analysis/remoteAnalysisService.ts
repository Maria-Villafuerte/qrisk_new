import { timeouts } from '../api/config';
import { ApiError } from '../api/errors';
import { postJson } from '../api/httpClient';
import { loadHistory } from '../storage/historyStorage';
import { adaptAnalysisResponse, degradedResult, type RemoteAnalysisResponse } from './adaptAnalysis';
import type { AnalysisResult, AnalysisService, ScanRecord } from './types';

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
    default:
      return 'El servicio de análisis no respondió correctamente.';
  }
}

class RemoteAnalysisService implements AnalysisService {
  async analyze(url: string): Promise<AnalysisResult> {
    try {
      const response = await postJson<RemoteAnalysisResponse>(
        '/analyze',
        { url },
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

  /**
   * El historial es local por diseno (la metrica pide que sea 100% recuperable
   * sin conexion), asi que se lee del dispositivo y no del servidor.
   */
  async getHistory(): Promise<ScanRecord[]> {
    return loadHistory().map((entry) => entry.record);
  }
}

export const remoteAnalysisService: AnalysisService = new RemoteAnalysisService();
