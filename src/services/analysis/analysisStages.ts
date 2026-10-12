import type { AnalysisStageKey } from './types';

/**
 * Etapas de la cascada, en orden. La pantalla de carga las recorre para
 * mostrar el progreso mientras el backend responde.
 *
 * POR QUE AHORA HAY TRES (antes habia una). Hasta el 2026-10-01 el backend
 * mandaba una sola respuesta plana y anunciar etapas separadas habria sido
 * fingir una cascada que no ocurria. Con la entrega de F1 + F2.1 + F2.2 + F2.3
 * la cascada existe de verdad, en este orden, y el backend informa cual filtro
 * decidio (`filtro_decisivo`). Medido el 2026-10-11:
 *
 *   - Corte por F1 (la app manda `resultadoF1`): ~5 s.
 *   - Corte por F2.1 (score > 60): 24.5 s. Sin captura: el backend no la
 *     genera cuando corta aqui.
 *   - Corte por F2.2 (VirusTotal / URLScan): 28.1 s. Con captura.
 *   - Sin concluir (PENDIENTE): 33.2 s.
 *
 * LOS TIEMPOS DE ABAJO NO SON UNA PROMESA. La pantalla los usa para avanzar el
 * indicador mientras espera; la respuesta real llega cuando llega. Se eligieron
 * proporcionales al costo medido de cada filtro para que el progreso no se
 * quede clavado en la primera etapa durante 30 s, que es lo que hacia antes.
 *
 * Este archivo se llamaba `analysisService.ts` y ademas contenia el mock y el
 * interruptor mock/real. Los dos se eliminaron el 2026-09-20, cuando el
 * backend empezo a responder.
 */
export const analysisStages: {
  key: AnalysisStageKey;
  /** Texto mientras la etapa esta en curso. */
  runningLabel: string;
  /** Texto cuando ya termino. */
  doneLabel: string;
  /** Milisegundos que tarda esta etapa. */
  durationMs: number;
}[] = [
  {
    key: 'reputation',
    // F1. Se resuelve en el telefono: lista local de dominios confiables
    // (`localF1.ts`) mas una consulta a Google Safe Browsing con tope de 4 s
    // (`safeBrowsing.ts`). Sin clave configurada es instantaneo; con clave,
    // hasta 4 s. Se usan 3 s como punto medio para que el indicador no salte
    // de golpe ni se quede corto.
    runningLabel: 'Consultando listas de reputación…',
    doneLabel: 'Listas de reputación consultadas',
    durationMs: 3_000,
  },
  {
    key: 'heuristics',
    // F2.1: 13 criterios sobre la estructura de la URL. Nunca visita el sitio.
    runningLabel: 'Analizando la estructura del enlace…',
    doneLabel: 'Estructura del enlace analizada',
    durationMs: 8_000,
  },
  {
    key: 'behavior',
    // F2.2: consulta URLScan.io y VirusTotal en paralelo. Es la etapa caras:
    // el presupuesto de tiempo compartido del backend vive aqui, y F2.3 (la
    // captura) se genera dentro de ella cuando corresponde.
    runningLabel: 'Consultando fuentes de reputación externas…',
    doneLabel: 'Fuentes externas consultadas',
    durationMs: 16_000,
  },
];
