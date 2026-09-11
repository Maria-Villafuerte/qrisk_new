import { timeouts } from '../api/config';
import { ApiError } from '../api/errors';
import { postJson } from '../api/httpClient';
import type { AnalysisResult } from '../analysis/types';

/**
 * Envio del reporte de un QR malicioso.
 *
 * El reporte es ANONIMO: no lleva identificador de usuario ni coordenadas.
 * El `place` es texto que escribe la persona, no una ubicacion del GPS.
 */

/** Limites del contrato (endpoints_api.txt, seccion 2). */
export const COMMENT_MAX = 500;
export const PLACE_MAX = 200;

export interface ReportDraft {
  comment: string;
  place: string;
}

export interface ReportPayload {
  scanId?: string;
  url: string;
  verdict: string;
  comment?: string;
  place?: string;
  reportedAt: string;
}

/** Resultado del envio, para que la pantalla decida que decir. */
export type ReportOutcome =
  | { ok: true }
  | { ok: false; message: string; retryable: boolean };

/** Errores de validacion por campo. Vacio = se puede enviar. */
export interface ReportValidation {
  comment?: string;
  place?: string;
}

/**
 * Valida antes de gastar una llamada de red. Los dos campos son opcionales,
 * asi que solo se comprueba el largo.
 */
export function validateReport(draft: ReportDraft): ReportValidation {
  const errors: ReportValidation = {};

  if (draft.comment.length > COMMENT_MAX) {
    errors.comment = `El comentario no puede pasar de ${COMMENT_MAX} caracteres.`;
  }
  if (draft.place.length > PLACE_MAX) {
    errors.place = `El lugar no puede pasar de ${PLACE_MAX} caracteres.`;
  }

  return errors;
}

/** Arma el cuerpo del reporte a partir del analisis y lo que escribio la persona. */
export function buildReportPayload(
  result: AnalysisResult,
  draft: ReportDraft,
  now: Date = new Date(),
): ReportPayload {
  const comment = draft.comment.trim();
  const place = draft.place.trim();

  return {
    ...(result.scanId ? { scanId: result.scanId } : {}),
    url: result.url,
    verdict: result.verdict,
    // Los opcionales solo viajan si tienen contenido.
    ...(comment ? { comment } : {}),
    ...(place ? { place } : {}),
    reportedAt: now.toISOString(),
  };
}

/**
 * Envia el reporte. No lanza: devuelve el resultado para que la pantalla
 * conserve lo que la persona escribio si algo falla.
 */
export async function submitReport(
  result: AnalysisResult,
  draft: ReportDraft,
): Promise<ReportOutcome> {
  try {
    await postJson('/reports', buildReportPayload(result, draft), {
      timeoutMs: timeouts.analyze,
    });
    return { ok: true };
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : null;

    return {
      ok: false,
      message: error?.retryable
        ? 'No se pudo enviar el reporte. Revisa tu conexión e inténtalo de nuevo.'
        : 'No se pudo enviar el reporte.',
      retryable: error?.retryable ?? true,
    };
  }
}
