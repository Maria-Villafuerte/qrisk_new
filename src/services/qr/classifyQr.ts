import type { NonUrlContent } from '../analysis/types';

/**
 * Clasificacion del contenido crudo de un QR. Es una funcion pura a
 * proposito: la metrica exige precision >= 98% y esto se prueba con tests
 * unitarios sin necesidad de camara ni de backend.
 */
export type QrClassification =
  | { kind: 'url'; url: string }
  | { kind: 'wifi'; content: NonUrlContent }
  | { kind: 'other'; content: NonUrlContent };

/**
 * Esquemas que son enlaces navegables y por tanto pasan al analisis. Se
 * excluyen a proposito los que no se pueden "visitar" (mailto, tel, geo...):
 * esos no tienen nada que analizar y van a la pantalla de contenido.
 */
const WEB_SCHEME = /^https?:\/\//i;

/**
 * QR sin esquema pero que claramente es un dominio ("cafeaurora.com/menu").
 * Es el caso mas comun de los QR impresos, y hay que tratarlo como enlace o
 * se clasificaria mal una parte grande de la muestra.
 */
const BARE_DOMAIN =
  /^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;

/** Etiquetas de los formatos conocidos que no son enlaces. */
const KNOWN_PREFIXES: { test: RegExp; label: string; title: string }[] = [
  { test: /^BEGIN:VCARD/i, label: 'CONTACTO', title: 'Este QR contiene un contacto' },
  { test: /^BEGIN:VEVENT/i, label: 'EVENTO', title: 'Este QR contiene un evento' },
  { test: /^mailto:/i, label: 'CORREO', title: 'Este QR contiene un correo' },
  { test: /^(tel|sms|smsto):/i, label: 'TELÉFONO', title: 'Este QR contiene un número' },
  { test: /^geo:/i, label: 'UBICACIÓN', title: 'Este QR contiene una ubicación' },
];

/**
 * Decide que hacer con el texto leido del QR.
 *
 *   URL       -> sigue al analisis de seguridad
 *   WIFI:...  -> pantalla de contenido, con los campos de la red
 *   resto     -> pantalla de contenido generica
 */
export function classifyQr(raw: string): QrClassification {
  const value = raw.trim();

  if (WIFI_PREFIX.test(value)) {
    return { kind: 'wifi', content: buildWifiContent(value) };
  }

  if (WEB_SCHEME.test(value)) {
    return { kind: 'url', url: value };
  }

  // Sin esquema: solo cuenta como enlace si parece un dominio de verdad. Asi
  // "Mesa 12" o un numero de serie no se mandan al analisis.
  if (!value.includes(' ') && BARE_DOMAIN.test(value)) {
    return { kind: 'url', url: `https://${value}` };
  }

  return { kind: 'other', content: buildGenericContent(value) };
}

const WIFI_PREFIX = /^WIFI:/i;

/** Campos del formato WIFI:T:WPA2;S:red;P:clave;; */
export interface WifiCredentials {
  /** Nombre de la red (SSID). */
  ssid: string;
  /** WPA2, WEP, nopass... Vacio si el QR no lo declara. */
  security: string;
  password: string;
  /** true si la red oculta su SSID. */
  hidden: boolean;
}

/**
 * Parsea el formato WIFI:. Los valores admiten escapes con contrabarra
 * (\; \: \\), que hay que deshacer o un SSID con punto y coma se corta.
 */
export function parseWifi(raw: string): WifiCredentials {
  const body = raw.replace(WIFI_PREFIX, '').replace(/;;\s*$/, '');
  const fields: Record<string, string> = {};

  let key = '';
  let buffer = '';
  let readingKey = true;
  let escaped = false;

  for (const char of body) {
    if (escaped) {
      buffer += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === ':' && readingKey) {
      key = buffer;
      buffer = '';
      readingKey = false;
      continue;
    }
    if (char === ';') {
      if (!readingKey) fields[key.toUpperCase()] = buffer;
      key = '';
      buffer = '';
      readingKey = true;
      continue;
    }
    buffer += char;
  }
  // Ultimo campo cuando el QR no termina en ";".
  if (!readingKey && key) fields[key.toUpperCase()] = buffer;

  return {
    ssid: fields.S ?? '',
    security: (fields.T ?? '').toUpperCase(),
    password: fields.P ?? '',
    hidden: (fields.H ?? '').toLowerCase() === 'true',
  };
}

/** Como se nombra cada tipo de seguridad en la pantalla. */
function securityLabel(security: string): string {
  if (!security || security === 'NOPASS') return 'Abierta';
  if (security === 'WPA') return 'WPA/WPA2';
  return security;
}

function buildWifiContent(raw: string): NonUrlContent {
  const wifi = parseWifi(raw);
  const rows: NonUrlContent['rows'] = [
    { label: 'Red', value: wifi.ssid || 'No especificada' },
    { label: 'Seguridad', value: securityLabel(wifi.security) },
  ];

  // La contrasena se enmascara en pantalla; el texto real solo sale por el
  // boton de copiar, igual que en el diseno.
  if (wifi.password) {
    rows.push({ label: 'Contraseña', value: '•'.repeat(8), mono: true });
  }
  if (wifi.hidden) {
    rows.push({ label: 'Red oculta', value: 'Sí' });
  }

  return {
    kind: 'wifi',
    label: 'RED WI-FI',
    title: 'Este QR no contiene un enlace',
    description:
      'Es una configuración de red Wi-Fi, así que no necesita análisis de seguridad.',
    rows,
    raw,
  };
}

function buildGenericContent(raw: string): NonUrlContent {
  const known = KNOWN_PREFIXES.find((entry) => entry.test.test(raw));

  return {
    kind: 'text',
    label: known?.label ?? 'TEXTO',
    title: known?.title ?? 'Este QR no contiene un enlace',
    description: known
      ? 'No es un enlace, así que no necesita análisis de seguridad.'
      : 'Es texto sin un enlace, así que no necesita análisis de seguridad.',
    rows: [{ label: 'Contenido', value: truncate(raw, 120) }],
    raw,
  };
}

/** Evita que un QR muy largo desborde la tarjeta de detalle. */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
