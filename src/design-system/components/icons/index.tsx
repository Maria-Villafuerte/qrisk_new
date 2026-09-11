import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette, VerdictKey } from '../../tokens';

/**
 * Iconos portados desde "QRisk Pantallas.dc.html".
 * Los paths son los mismos del diseno; no redibujar a ojo.
 */

export interface IconProps {
  size?: number;
  color?: string;
}

type StrokeIconProps = IconProps & { strokeWidth?: number };

const DEFAULT_COLOR = palette.textSecondary;

/** Contorno del escudo, base de toda la iconografia de veredicto. */
const SHIELD_OUTLINE =
  'M16 3.5l9.5 3.8v6.9c0 6.2-3.9 10.9-9.5 12.8-5.6-1.9-9.5-6.6-9.5-12.8V7.3z';

/** Marca interior del escudo segun veredicto. */
export const verdictMarks: Record<VerdictKey, string[]> = {
  seguro: ['M11 16.8l3.2 3.2 6.8-7.2'],
  sospechoso: ['M16 10.2v6.4', 'M16 20.8v.01'],
  malicioso: ['M12.6 12.6l6.8 6.8', 'M19.4 12.6l-6.8 6.8'],
  incierto: ['M10.6 16h.01', 'M16 16h.01', 'M21.4 16h.01'],
};

/** Escudo con la marca del veredicto. */
export function VerdictShield({
  verdict,
  size = 24,
  color = DEFAULT_COLOR,
  strokeWidth = 3,
}: StrokeIconProps & { verdict: VerdictKey }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d={SHIELD_OUTLINE} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      {verdictMarks[verdict].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth + 0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

/** Logo de marca: escudo relleno con modulos de QR. */
export function BrandMark({
  size = 22,
  color = palette.brand,
  moduleColor = '#FFFFFF',
}: IconProps & { moduleColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 2.6l10.4 4.2v7.4c0 6.7-4.2 11.8-10.4 13.8C9.8 26 5.6 20.9 5.6 14.2V6.8z"
        fill={color}
      />
      <Rect x={11.5} y={9.5} width={4.2} height={4.2} rx={1.1} fill={moduleColor} />
      <Rect x={17.6} y={9.5} width={3} height={3} rx={0.8} fill={moduleColor} opacity={0.7} />
      <Rect x={11.5} y={15.6} width={3} height={3} rx={0.8} fill={moduleColor} opacity={0.7} />
      <Rect x={16.4} y={15} width={4.4} height={4.4} rx={1.1} fill={moduleColor} />
    </Svg>
  );
}

export function CameraIcon({
  size = 24,
  color = DEFAULT_COLOR,
  strokeWidth = 1.8,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.7A2 2 0 0 1 10.5 3.4h3a2 2 0 0 1 1.7.9L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={3.4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function LocationIcon({
  size = 24,
  color = DEFAULT_COLOR,
  strokeWidth = 1.8,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.5s-7.2-5.4-7.2-11.3a7.2 7.2 0 0 1 14.4 0C19.2 16.1 12 21.5 12 21.5z"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle cx={12} cy={10.2} r={2.4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function LockIcon({ size = 16, color = DEFAULT_COLOR, strokeWidth = 1.8 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = DEFAULT_COLOR, strokeWidth = 1.8 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.2} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7.5V12l3 1.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({
  size = 17,
  color = palette.textTertiary,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronLeftIcon({
  size = 18,
  color = palette.textPrimary,
  strokeWidth = 2,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 6l-6 6 6 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronDownIcon({
  size = 16,
  color = palette.textTertiary,
  strokeWidth = 2,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9.5l6 6 6-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Circulo relleno con check — hallazgo favorable. */
export function CheckCircleIcon({
  size = 17,
  color = '#157A46',
  background = '#E3F3E9',
}: IconProps & { background?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill={background} />
      <Path
        d="M8.5 12.2l2.4 2.4 4.6-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Circulo relleno con signo de admiracion — hallazgo de riesgo. */
export function WarningCircleIcon({
  size = 17,
  color = '#A2580A',
  background = '#FBF0DF',
}: IconProps & { background?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill={background} />
      <Path d="M12 7.5v5.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 15.8v.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ReputationIcon({
  size = 19,
  color = DEFAULT_COLOR,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function HeuristicsIcon({
  size = 19,
  color = DEFAULT_COLOR,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19V10 M10 19V5 M16 19v-8 M22 19H2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BehaviorIcon({
  size = 19,
  color = DEFAULT_COLOR,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={14} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M8 21h8 M7.5 9l3 2.5-3 2.5 M12.5 14h4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PreviewIcon({
  size = 19,
  color = DEFAULT_COLOR,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function FlagIcon({ size = 15, color = DEFAULT_COLOR, strokeWidth = 1.9 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 21V4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M5.5 5h11.2l-2.4 4 2.4 4H5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StoryCardIcon({
  size = 15,
  color = DEFAULT_COLOR,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={3} width={16} height={18} rx={3} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={10} r={2.6} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8 17h8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function WifiIcon({
  size = 44,
  color = palette.brand,
  strokeWidth = 1.9,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 9a14.5 14.5 0 0 1 19 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M5.5 12.5a10 10 0 0 1 13 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M8.5 16a5.5 5.5 0 0 1 7 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={19.3} r={1.6} fill={color} />
    </Svg>
  );
}

export function CopyIcon({ size = 15, color = palette.brand, strokeWidth = 1.8 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={12} height={12} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M5 15.5A2.5 2.5 0 0 1 4 13.5v-7A2.5 2.5 0 0 1 6.5 4h7c.9 0 1.7.5 2.1 1.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function FlashlightIcon({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 1.8,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.5 2.5L6 13.5h5l-1 8L18 10.5h-5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ size = 17, color = '#FFFFFF', strokeWidth = 2 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v12 M12 3l-4 4 M12 3l4 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DownloadIcon({
  size = 17,
  color = palette.textPrimary,
  strokeWidth = 2,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v11 M12 15l-4-4 M12 15l4-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 16v2.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GalleryIcon({
  size = 15,
  color = palette.textPrimary,
  strokeWidth = 1.8,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={4.5} width={17} height={15} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={9} cy={10} r={1.7} stroke={color} strokeWidth={1.6} />
      <Path
        d="M4.5 17l4.5-4 3.5 3 3-2.5 4 3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Escudo con check, usado en el aviso azul de la pantalla de reporte. */
export function ShieldCheckIcon({
  size = 18,
  color = palette.brand,
  strokeWidth = 1.8,
}: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l8 3.2v5.6c0 5-3.2 8.8-8 10.2-4.8-1.4-8-5.2-8-10.2V6.2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M9 12.2l2.2 2.2 4-4.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Patron de QR decorativo de la Story Card (se difumina por seguridad). */
export function QrPattern({ size = 86 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 29 29">
      <Rect width={29} height={29} fill="#FFFFFF" />
      <Path d="M1 1h7v7H1z M21 1h7v7h-7z M1 21h7v7H1z" fill={palette.textPrimary} />
      <Path d="M3 3h3v3H3z M23 3h3v3h-3z M3 23h3v3H3z" fill="#FFFFFF" />
      <Path
        d="M10 1h2v2h-2z M14 1h2v3h-2z M18 2h2v2h-2z M10 4h3v2h-3z M16 5h2v2h-2z M10 8h2v2h-2z M13 8h2v2h-2z M19 8h2v2h-2z M1 10h2v2H1z M4 10h2v3H4z M8 10h3v2H8z M13 11h3v3h-3z M18 10h2v3h-2z M22 10h2v2h-2z M26 10h2v3h-2z M2 14h3v2H2z M7 14h2v2H7z M11 15h2v2h-2z M17 14h3v2h-3z M22 14h2v3h-2z M25 15h3v2h-3z M1 18h2v2H1z M5 17h2v3H5z M9 18h3v2H9z M14 18h2v2h-2z M18 18h2v2h-2z M21 18h3v2h-3z M26 18h2v2h-2z M10 21h2v3h-2z M14 22h3v2h-3z M18 21h2v2h-2z M10 26h3v2h-3z M15 26h2v2h-2z M21 22h2v2h-2z M24 21h2v3h-2z M27 22h1v3h-1z M19 25h3v3h-3z M24 26h3v2h-3z"
        fill={palette.textPrimary}
      />
    </Svg>
  );
}
