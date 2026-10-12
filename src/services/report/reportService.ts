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

/**
 * Cuerpo que espera `POST /report`, tal como lo define el contrato del backend.
 *
 * LOS NOMBRES SON LOS DEL BACKEND, en espanol, a proposito: este es el borde
 * del sistema y lo que viaja tiene que coincidir con lo que el servidor lee.
 * La app sigue hablando en sus propios terminos (`ReportDraft`), y la
 * traduccion ocurre en `buildReportPayload`, que es el unico lugar que
 * conoce las dos formas.
 *
 * El contrato acepta exactamente tres campos. Lo que la app mandaba antes
 * (`verdict`, `reportedAt`, `place` y `scanId` como cadena) no existe de ese
 * lado: se enviaba a `/reports` —en plural, un endpoint que nunca existio— y
 * el servidor lo habria ignorado por completo.
 */
export interface ReportPayload {
  /** La URL reportada. Requerido. */
  url: string;
  /**
   * Texto libre de la persona. Junta el comentario y el lugar, porque el
   * contrato tiene un solo campo de texto y el lugar es informacion que vale
   * conservar: "lo vi en un poste de la zona 10" ayuda a entender el reporte.
   */
  motivo?: string;
  /**
   * `id` del analisis previo en el backend, para vincular el reporte. Es un
   * ENTERO en el contrato. Solo viaja si el analisis trajo un id numerico:
   * mandar uno inventado hace que el servidor responda 400.
   */
  analisis_id?: number;
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

/**
 * Junta el comentario y el lugar en el unico campo de texto del contrato.
 *
 * El backend recibe `motivo` y nada mas, pero el formulario pregunta dos
 * cosas. Descartar el lugar seria perder la respuesta de la persona; meterlo
 * sin etiqueta lo volveria indistinguible del comentario. Se etiqueta.
 */
function composeMotivo(comment: string, place: string): string | undefined {
  const parts: string[] = [];
  if (comment) parts.push(comment);
  if (place) parts.push(`Lugar: ${place}`);
  return parts.length > 0 ? parts.join('\n') : undefined;
}

/**
 * El `analisis_id` del contrato, si el analisis trae uno usable.
 *
 * El contrato lo quiere ENTERO y responde 400 si no corresponde a un analisis
 * real. `scanId` es una cadena en la app, asi que solo se manda cuando es un
 * entero limpio: una cadena como "abc" o "12.5" se omite en vez de provocar
 * un 400 que haria fallar un reporte por lo demas valido.
 */
function usableAnalysisId(scanId: string | undefined): number | undefined {
  if (!scanId) return undefined;
  if (!/^\d+$/.test(scanId.trim())) return undefined;

  const parsed = Number.parseInt(scanId.trim(), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Arma el cuerpo del reporte a partir del analisis y lo que escribio la
 * persona, en la forma que espera `POST /report`.
 *
 * SIGUE SIENDO ANONIMO. El contrato no tiene campo para identificar a nadie y
 * esta funcion no agrega ninguno: no viaja identificador de usuario, ni
 * coordenadas, ni la hora local. El `motivo` lleva solo lo que la persona
 * escribio.
 */
export function buildReportPayload(result: AnalysisResult, draft: ReportDraft): ReportPayload {
  const motivo = composeMotivo(draft.comment.trim(), draft.place.trim());
  const analisisId = usableAnalysisId(result.scanId);

  return {
    url: result.url,
    ...(motivo ? { motivo } : {}),
    ...(analisisId !== undefined ? { analisis_id: analisisId } : {}),
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
    await postJson('/report', buildReportPayload(result, draft), {
      timeoutMs: timeouts.report,
    });
    return { ok: true };
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : null;

    return {
      ok: false,
      message: messageFor(error),
      retryable: error?.retryable ?? true,
    };
  }
}

/**
 * Que se le dice a la persona segun por que fallo el envio.
 *
 * Se distingue el fallo del SERVIDOR del fallo de RED porque la accion que le
 * toca a cada uno es distinta: con un problema de conexion reintentar sirve,
 * con un 500 del servidor reintentar en el momento no cambia nada y conviene
 * decirlo en vez de invitar a insistir.
 *
 * Verificado el 2026-10-11: `/report` valida bien (400 con los codigos del
 * contrato) pero el guardado responde 500 de forma consistente. Eso cae en
 * 'SERVER' y produce el mensaje de "no es por tu conexion".
 */
function messageFor(error: ApiError | null): string {
  switch (error?.code) {
    case 'NETWORK':
      return 'No se pudo enviar el reporte. Revisa tu conexión e inténtalo de nuevo.';
    case 'TIMEOUT':
      return 'El servidor tardó demasiado en recibir el reporte. Puedes intentarlo de nuevo.';
    case 'RATE_LIMITED':
      return 'Se alcanzó el límite de envíos. Espera un momento antes de reintentar.';
    case 'INVALID_URL':
      return 'El servidor no aceptó esta dirección, así que el reporte no se guardó.';
    case 'INVALID_PAYLOAD':
      return 'El servidor rechazó los datos del reporte, así que no se guardó.';
    case 'INTERNAL':
      return 'El servidor no pudo guardar el reporte. No es por tu conexión; vuelve a intentarlo más tarde.';
    default:
      return 'No se pudo enviar el reporte.';
  }
}
