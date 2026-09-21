import { classifyQr } from '../classifyQr';

/**
 * Los QR de ejemplo que documenta el README. Si alguien cambia la
 * clasificacion, esta prueba falla antes de que la documentacion quede
 * mintiendo.
 */
describe('QRs de ejemplo del README', () => {
  const vanAlAnalisis = ['https://menu.cafeaurora.com/es', 'cafeaurora.com/menu'];

  it.each(vanAlAnalisis)('%s va al analisis', (raw) => {
    expect(classifyQr(raw).kind).toBe('url');
  });

  it('cafeaurora.com/menu recibe https://', () => {
    const result = classifyQr('cafeaurora.com/menu');
    if (result.kind === 'url') expect(result.url).toBe('https://cafeaurora.com/menu');
  });

  const noVanAlAnalisis: [string, string][] = [
    ['WIFI:T:WPA2;S:MiRed;P:clave123;;', 'RED WI-FI'],
    ['mailto:hola@ejemplo.com', 'CORREO'],
    ['tel:+50255512346', 'TELÉFONO'],
    ['geo:14.6349,-90.5069', 'UBICACIÓN'],
    ['BEGIN:VCARD\nFN:Maria\nEND:VCARD', 'CONTACTO'],
    ['Mesa 12', 'TEXTO'],
  ];

  it.each(noVanAlAnalisis)('%s NO va al analisis y se etiqueta %s', (raw, label) => {
    const result = classifyQr(raw);
    expect(result.kind).not.toBe('url');
    if (result.kind !== 'url') expect(result.content.label).toBe(label);
  });
});
