import type { Tone, VerdictKey } from '../../design-system/tokens';

export type { Tone, VerdictKey };

/**
 * Etapas de la cascada de filtros, en el orden en que se ejecutan.
 *
 * No incluye 'preview' (F2.3): ese filtro es del backend y todavia no existe,
 * asi que la app no lo anuncia. Al implementarse se agrega aqui, en
 * `analysisStages` y en el mapa de iconos de la pantalla de detalle.
 */
export type AnalysisStageKey = 'reputation' | 'heuristics' | 'behavior';

export interface Finding {
  tone: Tone;
  text: string;
}

export interface AnalysisSection {
  key: AnalysisStageKey;
  title: string;
  /** Resumen del estado de la seccion: "SIN ALERTAS", "3 ALERTAS". */
  badgeText: string;
  badgeTone: Tone;
  findings: Finding[];
  /** Nota al pie opcional; la manda el backend cuando hace falta aclarar algo. */
  footnote?: string;
}

export interface AnalysisResult {
  verdict: VerdictKey;
  /** Dominio legible, lo que el usuario debe reconocer. */
  domain: string;
  /** URL completa. Se muestra pero nunca se abre desde la app. */
  url: string;
  /** Recomendacion en lenguaje llano. */
  summary: string;
  /** 0 = seguro, 100 = peligroso. */
  riskScore: number;
  sections: AnalysisSection[];
  /** Identificador del analisis en el backend. Ausente en el mock. */
  scanId?: string;
  /** true si algun filtro fallo y el veredicto se calculo sin el. */
  degraded?: boolean;
  /** Filtros que aun no respondieron. Vacio o ausente = cascada completa. */
  pending?: AnalysisStageKey[];
}

/** Contenido de un QR que no es un enlace y por tanto no se analiza. */
export interface NonUrlContent {
  /** Formato reconocido. 'text' cubre todo lo que no tiene un tipo propio. */
  kind: 'wifi' | 'text';
  /** Etiqueta de la pildora: "RED WI-FI". */
  label: string;
  title: string;
  description: string;
  rows: { label: string; value: string; mono?: boolean }[];
  /** Texto plano que se copia al portapapeles. */
  raw: string;
}

export interface ScanRecord {
  id: string;
  domain: string;
  verdict: VerdictKey;
  /** Momento del escaneo en ISO 8601. Se formatea al pintar. */
  scannedAt: string;
  /** Lugar del escaneo; null si no habia ubicacion disponible. */
  place: string | null;
}

/**
 * Contrato del analisis. La implementacion actual es un mock local; un
 * backend real cumpliria esta misma firma sin tocar las pantallas.
 */
export interface AnalysisService {
  analyze(url: string): Promise<AnalysisResult>;
  getHistory(): Promise<ScanRecord[]>;
}
