import type { AnalysisResult, NonUrlContent, VerdictKey } from '../analysis/types';

/**
 * Datos de demostracion tomados de "QRisk Pantallas.dc.html".
 * Los textos son los del diseno: no reescribirlos sin revisar el mockup.
 *
 * Cada veredicto trae las tres secciones del mockup aunque la app solo pinte
 * las de los filtros activos (`enabledFilters.ts`): son datos de diseno, no la
 * lista de lo que se muestra. El dia que F2.1 o F2.2 se reactiven, su seccion
 * ya esta escrita y aparece sola.
 */

export const analysisByVerdict: Record<VerdictKey, AnalysisResult> = {
  seguro: {
    verdict: 'seguro',
    domain: 'menu.cafeaurora.com',
    url: 'https://menu.cafeaurora.com/es',
    summary: 'Este sitio parece seguro. Puedes abrirlo con confianza.',
    riskScore: 8,
    sections: [
      {
        key: 'reputation',
        title: 'Reputación',
        badgeText: 'SIN ALERTAS',
        badgeTone: 'ok',
        findings: [
          {
            tone: 'ok',
            text: 'No aparece en listas de sitios maliciosos conocidos (Google Safe Browsing, PhishTank).',
          },
          { tone: 'ok', text: 'El dominio lleva más de 4 años registrado.' },
        ],
      },
      {
        key: 'heuristics',
        title: 'Heurística',
        badgeText: 'SIN ALERTAS',
        badgeTone: 'ok',
        findings: [
          { tone: 'ok', text: 'Usa conexión cifrada (HTTPS).' },
          { tone: 'ok', text: 'El nombre del dominio coincide con el negocio esperado.' },
        ],
      },
      {
        key: 'behavior',
        title: 'Comportamiento',
        badgeText: 'SIN ALERTAS',
        badgeTone: 'ok',
        findings: [
          { tone: 'ok', text: 'No redirige a otros sitios.' },
          { tone: 'ok', text: 'No solicita datos personales ni bancarios.' },
        ],
      },
    ],
  },

  sospechoso: {
    verdict: 'sospechoso',
    domain: 'pagos-multas-gt.info',
    url: 'https://pagos-multas-gt.info/pago',
    summary:
      'Este sitio tiene señales de riesgo. Ábrelo solo si confías en quien puso el código.',
    riskScore: 68,
    sections: [
      {
        key: 'reputation',
        title: 'Reputación',
        badgeText: 'SIN ALERTAS',
        badgeTone: 'ok',
        findings: [
          {
            tone: 'ok',
            text: 'No aparece en listas de sitios maliciosos conocidos (Google Safe Browsing, PhishTank).',
          },
          {
            tone: 'warn',
            text: 'Las listas negras no detectan dominios muy nuevos: por eso el análisis continúa.',
          },
        ],
      },
      {
        key: 'heuristics',
        title: 'Heurística',
        badgeText: '3 ALERTAS',
        badgeTone: 'warn',
        findings: [
          { tone: 'warn', text: 'Dominio registrado hace 12 días.' },
          {
            tone: 'warn',
            text: 'Terminación “.info”, poco común en sitios oficiales de gobierno.',
          },
          {
            tone: 'warn',
            text: 'El nombre imita a una entidad de tránsito, pero no es el dominio oficial.',
          },
          { tone: 'ok', text: 'Usa conexión cifrada (HTTPS).' },
        ],
      },
      {
        key: 'behavior',
        title: 'Comportamiento',
        badgeText: '2 ALERTAS',
        badgeTone: 'warn',
        findings: [
          { tone: 'warn', text: 'Redirige 2 veces antes de llegar al sitio final.' },
          { tone: 'warn', text: 'Contiene un formulario que pide número de tarjeta.' },
          { tone: 'ok', text: 'No intenta descargar archivos.' },
        ],
      },
    ],
  },

  malicioso: {
    verdict: 'malicioso',
    domain: 'banco-lndustrial-seguro.top',
    url: 'http://banco-lndustrial-seguro.top/acceso',
    summary:
      'Este sitio es peligroso. No lo abras ni ingreses tus datos personales.',
    riskScore: 94,
    sections: [
      {
        key: 'reputation',
        title: 'Reputación',
        badgeText: '2 ALERTAS',
        badgeTone: 'warn',
        findings: [
          { tone: 'warn', text: 'Reportado como sitio de phishing en PhishTank.' },
          { tone: 'warn', text: 'Marcado como peligroso por Google Safe Browsing.' },
        ],
      },
      {
        key: 'heuristics',
        title: 'Heurística',
        badgeText: '3 ALERTAS',
        badgeTone: 'warn',
        findings: [
          {
            tone: 'warn',
            text: 'El nombre sustituye la “i” por una “l” para imitar a un banco real.',
          },
          { tone: 'warn', text: 'Dominio registrado hace 3 días.' },
          { tone: 'warn', text: 'No usa conexión cifrada: los datos viajan sin protección.' },
        ],
      },
      {
        key: 'behavior',
        title: 'Comportamiento',
        badgeText: '2 ALERTAS',
        badgeTone: 'warn',
        findings: [
          { tone: 'warn', text: 'Muestra una pantalla de acceso que copia la del banco.' },
          { tone: 'warn', text: 'Envía lo que escribes a un servidor distinto al del sitio.' },
        ],
      },
    ],
  },

  incierto: {
    verdict: 'incierto',
    domain: 'acorta.me/x7Kq2',
    url: 'https://acorta.me/x7Kq2',
    summary: 'No pudimos completar el análisis. Trata este enlace con precaución.',
    riskScore: 50,
    sections: [
      {
        key: 'reputation',
        title: 'Reputación',
        badgeText: 'SIN ALERTAS',
        badgeTone: 'ok',
        findings: [
          { tone: 'ok', text: 'El acortador no aparece en listas de sitios maliciosos.' },
          { tone: 'warn', text: 'La reputación del destino final no pudo verificarse.' },
        ],
      },
      {
        key: 'heuristics',
        title: 'Heurística',
        badgeText: '1 ALERTA',
        badgeTone: 'warn',
        findings: [
          {
            tone: 'warn',
            text: 'Es un enlace acortado: el destino real no se puede leer a simple vista.',
          },
          { tone: 'ok', text: 'Usa conexión cifrada (HTTPS).' },
        ],
      },
      {
        key: 'behavior',
        title: 'Comportamiento',
        badgeText: '1 ALERTA',
        badgeTone: 'warn',
        findings: [
          { tone: 'warn', text: 'El sitio no respondió a tiempo durante el análisis.' },
        ],
      },
    ],
  },
};

/** QR de configuracion Wi-Fi: no lleva enlace, asi que no se analiza. */
export const nonUrlFixture: NonUrlContent = {
  kind: 'wifi',
  label: 'RED WI-FI',
  title: 'Este QR no contiene un enlace',
  description:
    'Es una configuración de red Wi-Fi, así que no necesita análisis de seguridad.',
  rows: [
    { label: 'Red', value: 'CafeAurora_Invitados' },
    { label: 'Seguridad', value: 'WPA2' },
    { label: 'Contraseña', value: '••••••••', mono: true },
  ],
  raw: 'WIFI:T:WPA2;S:CafeAurora_Invitados;P:********;;',
};
