import type { Tone, VerdictKey } from '../../design-system/tokens';

export type { Tone, VerdictKey };

/**
 * Etapas de la cascada de filtros, en el orden en que se ejecutan.
 *
 * No incluye 'preview' (F2.3): ese filtro es del backend y todavia no existe,
 * asi que la app no lo anuncia. Al implementarse se agrega aqui, en
 * `analysisStages` y en el mapa de iconos de la pantalla de detalle.
 *
 * Este union es el VOCABULARIO de claves que la app sabe pintar, no la lista de
 * filtros activos: eso vive en `enabledFilters.ts`. Un filtro puede estar aqui
 * y apagado alli (hoy 'heuristics' y 'behavior'), porque el backend puede
 * seguir mandando su seccion y el adaptador debe poder tiparla.
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
  /**
   * URL completa. La app nunca la visita por su cuenta: solo se abre si la
   * persona lo pide desde la pantalla de resultado, y en el navegador del
   * sistema, nunca dentro de la app.
   */
  url: string;
  /** Recomendacion en lenguaje llano. */
  summary: string;
  /** 0 = seguro, 100 = peligroso. */
  riskScore: number;
  /**
   * true si el backend no mando un puntaje usable y `riskScore` es el neutro de
   * relleno. La pantalla esconde el medidor en ese caso: un 50 fijo pintado
   * igual para un SEGURO y para un MALICIOSO no mide nada.
   *
   * Ausente en las entradas del historial anteriores a este campo, que se
   * siguen pintando como antes.
   */
  riskScoreMissing?: boolean;
  /**
   * Por que este veredicto, en una o dos frases: que filtro decidio y con que
   * umbral. Ausente en entradas viejas del historial.
   */
  verdictReason?: string;
  sections: AnalysisSection[];
  /** Identificador del analisis en el backend. Opcional: hoy no lo manda. */
  scanId?: string;
  /** true si algun filtro fallo y el veredicto se calculo sin el. */
  degraded?: boolean;
  /** Filtros que aun no respondieron. Vacio o ausente = cascada completa. */
  pending?: AnalysisStageKey[];
  /**
   * Captura del sitio (F2.3), tomada por el backend en su entorno aislado.
   *
   * Es una URL firmada de S3 que CADUCA EN UNA HORA, asi que no sirve para el
   * historial: una fila vieja la mostraria rota. Solo se pinta en el detalle
   * del analisis recien hecho. Ausente si el backend no pudo generarla.
   */
  screenshotUrl?: string;
}

/** Contenido de un QR que no es un enlace y por tanto no se analiza. */
export interface NonUrlContent {
  /** Formato reconocido. 'text' cubre todo lo que no tiene un tipo propio. */
  kind: 'wifi' | 'text';
  /** Etiqueta de la pildora: "RED WI-FI". */
  label: string;
  title: string;
  description: string;
  rows: {
    label: string;
    value: string;
    mono?: boolean;
    /**
     * Valor real de una fila enmascarada (la contrasena de una red Wi-Fi).
     * `value` lleva los puntos; esto solo se pinta si la persona pide verlo,
     * y es lo que copia "Copiar contraseña".
     */
    secret?: string;
  }[];
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
 * Contrato del analisis. Hoy lo cumple una sola implementacion,
 * `remoteAnalysisService`; se conserva como interfaz para poder inyectar
 * dobles en los tests y para cambiar de proveedor sin tocar las pantallas.
 */
export interface AnalysisService {
  analyze(url: string): Promise<AnalysisResult>;
}
