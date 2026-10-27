/**
 * Tokens del sistema visual de QRisk.
 * Extraidos de "QRisk Pantallas.dc.html" — no inventar valores nuevos aqui:
 * si el diseno no lo define, se compone a partir de lo que ya existe.
 */

export const palette = {
  // Superficies
  appBg: '#FCFBF9',
  canvas: '#EFECE6',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EEE8',
  surfaceMutedAlt: '#F3F1EC',
  skeletonBase: '#EFECE6',
  skeletonHighlight: '#F7F5F0',

  // Texto
  textPrimary: '#191C22',
  textBody: '#3A3F4C',
  textSecondary: '#5A6072',
  // Oscurecidos para cumplir WCAG AA (4.5:1) en texto chico. Los valores del
  // diseno (#8A8F9C y #9AA0AE) daban 3.1:1 y 2.5:1, y con ellos se pintan las
  // fechas del historial, las captions y la URL completa del resultado.
  textTertiary: '#676C7B',
  textPlaceholder: '#6B7080',
  /** Iconos decorativos apagados (estado vacio, etapa pendiente). */
  iconMuted: '#B9B4A8',
  /** Puntos inactivos del indicador de pasos. */
  dotIdle: '#DDD9D0',

  // Marca
  brand: '#2757D6',
  brandDark: '#1E45B3',
  brandTint: '#EAF0FE',
  brandBorder: '#DBE6FD',

  // Bordes
  border: '#EBE7DF',
  borderStrong: '#E3DFD6',
  divider: '#F1EEE8',
  trackBg: '#EDEAE3',

  // Escaner (fondo oscuro)
  scannerTop: '#31363F',
  scannerMid: '#23262D',
  scannerBottom: '#15171C',
  scanLine: 'rgba(122,166,255,0.95)',
  online: '#4ADE80',

  // Afiche de advertencia
  storyTop: '#465062',
  storyMid: '#2A3140',
  storyBottom: '#161B26',
} as const;

export type VerdictKey = 'seguro' | 'sospechoso' | 'malicioso';

export interface VerdictTheme {
  /** Color de texto/icono */
  color: string;
  /** Fondo suave para pildoras y circulos */
  tint: string;
  /** Borde del circulo grande de resultado */
  ring: string;
  /** Etiqueta en mayusculas */
  label: string;
  /** Etiqueta corta para el historial */
  shortLabel: string;
}

export const verdicts: Record<VerdictKey, VerdictTheme> = {
  seguro: {
    color: '#157A46',
    tint: '#E3F3E9',
    ring: '#BFE3CC',
    label: 'SEGURO',
    shortLabel: 'Seguro',
  },
  sospechoso: {
    color: '#A2580A',
    tint: '#FBF0DF',
    ring: '#ECD3AC',
    label: 'SOSPECHOSO',
    shortLabel: 'Sospechoso',
  },
  malicioso: {
    color: '#BE2B2B',
    tint: '#FBE9E9',
    ring: '#F0C6C6',
    label: 'MALICIOSO',
    shortLabel: 'Malicioso',
  },
};

/** Tono usado por los hallazgos y badges dentro del detalle del analisis. */
export const tones = {
  ok: { color: verdicts.seguro.color, tint: verdicts.seguro.tint },
  warn: { color: verdicts.sospechoso.color, tint: verdicts.sospechoso.tint },
} as const;

export type Tone = keyof typeof tones;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

export const radius = {
  sm: 12,
  md: 13,
  lg: 15,
  xl: 16,
  xxl: 22,
  sheet: 24,
  pill: 999,
} as const;

export const sizing = {
  /** Alto de los botones principales del diseno */
  buttonHeight: 52,
  /** Compacto, pero sin bajar del area tactil minima. */
  buttonHeightSm: 44,
  inputHeight: 48,
  headerHeight: 60,
  /** Boton circular de retroceso */
  backButton: 44,
  /** Area tactil minima recomendada */
  minTouchTarget: 44,
} as const;

export const shadows = {
  /** Sombra azul bajo el boton primario */
  primaryButton: {
    shadowColor: palette.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#121626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  toast: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 10,
  },
} as const;
