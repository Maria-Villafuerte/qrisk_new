import { classifyQr, parseWifi } from '../classifyQr';

/**
 * La metrica del anteproyecto exige >= 98% de acierto al distinguir un QR con
 * enlace de uno sin enlace. Se prueba en frio, sin camara: si un caso falla
 * aqui, falla tambien en la prueba en dispositivo.
 */
describe('classifyQr · enlaces', () => {
  it('reconoce https y http', () => {
    expect(classifyQr('https://menu.cafeaurora.com/es')).toEqual({
      kind: 'url',
      url: 'https://menu.cafeaurora.com/es',
    });
    expect(classifyQr('http://banco-lndustrial-seguro.top/acceso')).toEqual({
      kind: 'url',
      url: 'http://banco-lndustrial-seguro.top/acceso',
    });
  });

  it('acepta el esquema en mayusculas', () => {
    expect(classifyQr('HTTPS://Ejemplo.COM/ruta')).toEqual({
      kind: 'url',
      url: 'HTTPS://Ejemplo.COM/ruta',
    });
  });

  it('quita los espacios de alrededor', () => {
    expect(classifyQr('  https://ejemplo.com  ')).toEqual({
      kind: 'url',
      url: 'https://ejemplo.com',
    });
  });

  it('trata un dominio sin esquema como enlace y le agrega https', () => {
    // El caso mas comun de los QR impresos.
    expect(classifyQr('cafeaurora.com/menu')).toEqual({
      kind: 'url',
      url: 'https://cafeaurora.com/menu',
    });
    expect(classifyQr('wa.me/50255512346')).toEqual({
      kind: 'url',
      url: 'https://wa.me/50255512346',
    });
  });

  it('acepta subdominios, puerto y query', () => {
    expect(classifyQr('menu.tacontento.com.gt')).toEqual({
      kind: 'url',
      url: 'https://menu.tacontento.com.gt',
    });
    expect(classifyQr('ejemplo.com:8080/x?y=1#z')).toEqual({
      kind: 'url',
      url: 'https://ejemplo.com:8080/x?y=1#z',
    });
  });
});

describe('classifyQr · lo que NO es enlace', () => {
  it('no manda texto suelto al analisis', () => {
    // El riesgo real: "Mesa 12" no puede terminar en la pantalla de analisis.
    const result = classifyQr('Mesa 12');
    expect(result.kind).toBe('other');
  });

  it('no confunde un numero de serie con un dominio', () => {
    expect(classifyQr('SN-48291-XR').kind).toBe('other');
  });

  it('clasifica los formatos conocidos con su etiqueta', () => {
    const cases: [string, string][] = [
      ['mailto:hola@ejemplo.com', 'CORREO'],
      ['tel:+50255512346', 'TELÉFONO'],
      ['smsto:+50255512346:hola', 'TELÉFONO'],
      ['geo:14.6349,-90.5069', 'UBICACIÓN'],
      ['BEGIN:VCARD\nFN:Maria\nEND:VCARD', 'CONTACTO'],
      ['BEGIN:VEVENT\nSUMMARY:Defensa\nEND:VEVENT', 'EVENTO'],
    ];

    for (const [raw, label] of cases) {
      const result = classifyQr(raw);
      expect(result.kind).toBe('other');
      if (result.kind === 'other') {
        expect(result.content.label).toBe(label);
      }
    }
  });

  it('recorta el contenido muy largo para que no desborde la tarjeta', () => {
    const result = classifyQr('x'.repeat(300));
    expect(result.kind).toBe('other');
    if (result.kind === 'other') {
      expect(result.content.rows[0].value.length).toBeLessThanOrEqual(120);
      expect(result.content.rows[0].value.endsWith('…')).toBe(true);
    }
  });

  it('conserva el texto crudo para copiarlo', () => {
    const raw = 'Mesa 12';
    const result = classifyQr(raw);
    if (result.kind === 'other') {
      expect(result.content.raw).toBe(raw);
    }
  });
});

describe('classifyQr · Wi-Fi', () => {
  it('reconoce el formato WIFI: y arma las filas', () => {
    const result = classifyQr('WIFI:T:WPA2;S:CafeAurora_Invitados;P:clave123;;');
    expect(result.kind).toBe('wifi');
    if (result.kind === 'wifi') {
      expect(result.content.label).toBe('RED WI-FI');
      expect(result.content.rows[0]).toEqual({ label: 'Red', value: 'CafeAurora_Invitados' });
    }
  });

  it('enmascara la contrasena en pantalla', () => {
    const result = classifyQr('WIFI:T:WPA2;S:red;P:secreto;;');
    if (result.kind === 'wifi') {
      const pass = result.content.rows.find((r) => r.label === 'Contraseña');
      expect(pass?.value).toBe('••••••••');
      expect(pass?.value).not.toContain('secreto');
      // El texto real va aparte, para mostrarlo o copiarlo a peticion.
      expect(pass?.secret).toBe('secreto');
      expect(result.content.raw).toContain('secreto');
    }
  });

  it('guarda la contrasena sin los escapes del formato', () => {
    const result = classifyQr('WIFI:T:WPA2;S:red;P:a\\;b;;');
    if (result.kind === 'wifi') {
      const pass = result.content.rows.find((r) => r.label === 'Contraseña');
      expect(pass?.secret).toBe('a;b');
    }
  });

  it('marca las redes abiertas y las ocultas', () => {
    const abierta = classifyQr('WIFI:T:nopass;S:Libre;;');
    if (abierta.kind === 'wifi') {
      expect(abierta.content.rows[1]).toEqual({ label: 'Seguridad', value: 'Abierta' });
      expect(abierta.content.rows.some((r) => r.label === 'Contraseña')).toBe(false);
    }

    const oculta = classifyQr('WIFI:T:WPA;S:Oculta;P:x;H:true;;');
    if (oculta.kind === 'wifi') {
      expect(oculta.content.rows.some((r) => r.label === 'Red oculta')).toBe(true);
    }
  });
});

describe('parseWifi', () => {
  it('lee los cuatro campos', () => {
    expect(parseWifi('WIFI:T:WPA2;S:MiRed;P:clave;H:true;;')).toEqual({
      ssid: 'MiRed',
      security: 'WPA2',
      password: 'clave',
      hidden: true,
    });
  });

  it('deshace los escapes: un SSID con ; : o \\ no se corta', () => {
    // En el QR el escape es una sola contrabarra (\\; \\:); en el literal de
    // JavaScript hay que duplicarla para que llegue asi a la funcion.
    const wifi = parseWifi('WIFI:T:WPA2;S:Red\\;Rara\\:2;P:a\\\\b;;');
    expect(wifi.ssid).toBe('Red;Rara:2');
    expect(wifi.password).toBe('a\\b');
  });

  it('tolera que falte el punto y coma final', () => {
    expect(parseWifi('WIFI:S:SinCierre').ssid).toBe('SinCierre');
  });

  it('devuelve vacios cuando el QR no declara los campos', () => {
    expect(parseWifi('WIFI:;')).toEqual({
      ssid: '',
      security: '',
      password: '',
      hidden: false,
    });
  });

  it('normaliza la seguridad a mayusculas y hidden solo con "true"', () => {
    const wifi = parseWifi('WIFI:T:wpa2;S:r;H:false;;');
    expect(wifi.security).toBe('WPA2');
    expect(wifi.hidden).toBe(false);
  });
});
