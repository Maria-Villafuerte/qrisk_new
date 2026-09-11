import { TextStyle } from 'react-native';
import { palette } from './tokens';

/**
 * Figtree se carga en app/_layout.tsx. React Native no soporta `fontWeight`
 * numerico sobre fuentes personalizadas de forma fiable en Android, asi que
 * cada peso es una familia distinta.
 */
export const fontFamily = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

/** Fuente monoespaciada para URLs, usada tal cual en el diseno. */
export const monoFontFamily = 'monospace';

type TextToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'color'
>;

export const text = {
  /** Titulo grande de pantallas de onboarding */
  display: {
    fontFamily: fontFamily.extrabold,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.23,
    color: palette.textPrimary,
  },
  /** Titulo de pantalla intermedio (NonUrl) */
  displaySm: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.22,
    color: palette.textPrimary,
  },
  /** Dominio en la pantalla de resultado */
  domain: {
    fontFamily: fontFamily.bold,
    fontSize: 21,
    lineHeight: 26,
    color: palette.textPrimary,
  },
  /** Titulo del header de pantalla */
  header: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
    color: palette.textPrimary,
  },
  sheetTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 18,
    lineHeight: 24,
    color: palette.textPrimary,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 21,
    color: palette.textBody,
  },
  /** Texto de boton principal */
  button: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: palette.textPrimary,
  },
  buttonSm: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: palette.textPrimary,
  },
  /** Parrafo principal */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 23,
    color: palette.textSecondary,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: palette.textSecondary,
  },
  /** Texto de hallazgos dentro de los acordeones */
  finding: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: palette.textBody,
  },
  /** Titulo de tarjeta / seccion */
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: palette.textPrimary,
  },
  cardTitleSm: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: palette.textPrimary,
  },
  /** Nombre de dominio en una fila del historial */
  listTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14.5,
    lineHeight: 19,
    color: palette.textPrimary,
  },
  /** Valor de una fila clave/valor */
  rowValue: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: palette.textPrimary,
  },
  rowLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: palette.textTertiary,
  },
  /** Etiqueta de campo de formulario, en mayusculas */
  fieldLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.48,
    color: palette.textSecondary,
  },
  /** Texto de pildora de veredicto */
  pill: {
    fontFamily: fontFamily.extrabold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.04,
    color: palette.textPrimary,
  },
  pillSm: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
    color: palette.textPrimary,
  },
  /** Badge dentro de la cabecera de un acordeon */
  badge: {
    fontFamily: fontFamily.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: palette.textPrimary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: palette.textTertiary,
  },
  captionMd: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  captionSm: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    lineHeight: 16,
    color: palette.textTertiary,
  },
  /** Escala minima: extremos del medidor de riesgo */
  micro: {
    fontFamily: fontFamily.medium,
    fontSize: 10.5,
    lineHeight: 14,
    color: palette.textTertiary,
  },
  /** URL completa, siempre monoespaciada */
  mono: {
    fontFamily: monoFontFamily,
    fontSize: 12.5,
    lineHeight: 18,
    color: palette.textBody,
  },
  monoSm: {
    fontFamily: monoFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: palette.textTertiary,
  },
} satisfies Record<string, TextToken>;
