import {
  adaptAnalysisResponse,
  degradedResult,
  domainFromUrl,
  fixEngineGrammar,
  mapVerdict,
} from '../adaptAnalysis';
import { ENABLED_FILTERS } from '../enabledFilters';
import type { F1Outcome } from '../f1Filter';
import type { AnalysisResult, AnalysisSection, AnalysisStageKey } from '../types';

/** La seccion de un filtro. Falla el test si no esta, en vez de dar undefined. */
function section(result: AnalysisResult, key: AnalysisStageKey): AnalysisSection {
  const found = result.sections.find((s) => s.key === key);
  if (!found) throw new Error(`falta la seccion ${key}`);
  return found;
}

/** Los textos de los hallazgos de un filtro. */
function texts(result: AnalysisResult, key: AnalysisStageKey): string[] {
  return section(result, key).findings.map((f) => f.text);
}

/**
 * Pruebas contra las respuestas REALES observadas del endpoint desplegado,
 * no contra el contrato en papel: hoy no coinciden.
 */
describe('mapVerdict', () => {
  it('traduce los cuatro veredictos conocidos', () => {
    expect(mapVerdict('SEGURO')).toBe('seguro');
    expect(mapVerdict('SOSPECHOSO')).toBe('sospechoso');
    expect(mapVerdict('MALICIOSO')).toBe('malicioso');
    expect(mapVerdict('INCIERTO')).toBe('incierto');
  });

  it('traduce PENDIENTE a incierto', () => {
    // El quinto valor que hoy manda el endpoint. Sin este mapeo la app
    // reventaria al buscar el tema visual del veredicto.
    expect(mapVerdict('PENDIENTE')).toBe('incierto');
  });

  it('no distingue mayusculas ni espacios', () => {
    expect(mapVerdict(' seguro ')).toBe('seguro');
  });

  it('cae en incierto ante lo desconocido o lo ausente', () => {
    expect(mapVerdict('ALGO_NUEVO')).toBe('incierto');
    expect(mapVerdict(undefined)).toBe('incierto');
    expect(mapVerdict('')).toBe('incierto');
  });
});

describe('domainFromUrl', () => {
  it('saca el dominio sin abrir la URL', () => {
    expect(domainFromUrl('https://menu.cafeaurora.com/es')).toBe('menu.cafeaurora.com');
    expect(domainFromUrl('http://a.com')).toBe('a.com');
  });

  it('quita puerto y credenciales', () => {
    expect(domainFromUrl('https://ejemplo.com:8443/x')).toBe('ejemplo.com');
    expect(domainFromUrl('https://user:pass@ejemplo.com/x')).toBe('ejemplo.com');
  });

  it('tolera una URL sin esquema', () => {
    expect(domainFromUrl('cafeaurora.com/menu')).toBe('cafeaurora.com');
  });
});

describe('adaptAnalysisResponse · respuesta real del endpoint', () => {
  // Documentada en TAREAS_POR_HACER/endpoint.txt.
  const real = {
    url: 'https://ejemplo.com/',
    dominio: 'ejemplo.com',
    veredicto_final: 'PENDIENTE',
    filtro_decisivo: null,
    mensaje: 'F1 fue INCIERTO. F2.1 aún no implementado (S7).',
  };

  it('mapea dominio y url del espanol', () => {
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.domain).toBe('ejemplo.com');
    expect(result.url).toBe('https://ejemplo.com/');
  });

  it('convierte PENDIENTE en un incierto degradado', () => {
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.verdict).toBe('incierto');
    expect(result.degraded).toBe(true);
  });

  it('NO usa `mensaje` como copy: es texto de diagnostico', () => {
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.summary).not.toContain('F2.1');
    expect(result.summary).not.toContain('S7');
    expect(result.summary).toContain('No pudimos completar el análisis');
  });

  it('nunca inventa un puntaje bajo: usa el neutro', () => {
    // Un falso "seguro" es el peor resultado posible del producto.
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.riskScore).toBe(50);
  });

  it('rellena solo la seccion de los filtros activos', () => {
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    // Hoy solo F1 esta activo (`enabledFilters.ts`): F2.1 y F2.2 no existen en
    // el backend, asi que rellenar su seccion "SIN COMPLETAR" sugeriria un fallo
    // donde no lo hubo. 'preview' (F2.3) no esta implementado en ninguna capa.
    //
    // Se compara contra ENABLED_FILTERS y no contra un literal a proposito: el
    // sujeto de este test es "placeholderSections respeta la lista", y no debe
    // romperse el dia que se reactive un filtro. El literal se fija una sola
    // vez, en enabledFilters.test.ts.
    expect(result.sections.map((s) => s.key)).toEqual(ENABLED_FILTERS);
    // El contrato lo exige: nunca se omite una seccion en silencio.
    expect(result.sections.every((s) => s.badgeTone === 'warn')).toBe(true);
    expect(result.sections.every((s) => s.findings.length > 0)).toBe(true);
  });

  it('conserva el titulo de cada seccion rellenada', () => {
    // Mismo titulo que la seccion completada: no puede cambiar de nombre
    // segun si el analisis llego al final o no.
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.sections.map((s) => s.title)).toEqual([
      'Reputación',
      'Estructura del enlace',
      'Comportamiento',
    ]);
  });

  it('usa la URL pedida si la respuesta no la trae', () => {
    const result = adaptAnalysisResponse({ veredicto_final: 'PENDIENTE' }, 'https://pedida.com/x');
    expect(result.url).toBe('https://pedida.com/x');
    expect(result.domain).toBe('pedida.com');
  });
});

describe('adaptAnalysisResponse · respuesta que ya cumple el contrato', () => {
  it('respeta veredicto, puntaje, resumen y secciones del backend', () => {
    const result = adaptAnalysisResponse(
      {
        scanId: 'scn_8f2a91c4',
        url: 'https://pagos-multas-gt.info/pago',
        domain: 'pagos-multas-gt.info',
        verdict: 'sospechoso',
        riskScore: 68,
        summary: 'Este sitio tiene señales de riesgo.',
        sections: [
          {
            key: 'reputation',
            title: 'Reputación',
            badgeText: 'SIN ALERTAS',
            badgeTone: 'ok',
            findings: [{ tone: 'ok', text: 'No aparece en listas conocidas.' }],
          },
        ],
      },
      'https://pagos-multas-gt.info/pago',
    );

    expect(result.verdict).toBe('sospechoso');
    expect(result.riskScore).toBe(68);
    expect(result.summary).toBe('Este sitio tiene señales de riesgo.');
    expect(result.scanId).toBe('scn_8f2a91c4');
    expect(result.sections).toHaveLength(1);
    // Con secciones reales no se marca degradado.
    expect(result.degraded).toBeUndefined();
  });

  it('conserva pending cuando la cascada sigue en curso', () => {
    const result = adaptAnalysisResponse(
      { verdict: 'seguro', riskScore: 8, sections: [], pending: ['heuristics', 'behavior'] },
      'https://x.com',
    );
    expect(result.pending).toEqual(['heuristics', 'behavior']);
  });

  it('respeta degraded:true aunque vengan secciones', () => {
    const result = adaptAnalysisResponse(
      {
        verdict: 'incierto',
        degraded: true,
        sections: [
          { key: 'reputation', title: 'R', badgeText: 'X', badgeTone: 'warn', findings: [] },
        ],
      },
      'https://x.com',
    );
    expect(result.degraded).toBe(true);
  });
});

describe('degradedResult', () => {
  it('devuelve un incierto honesto con el motivo', () => {
    const result = degradedResult('https://ejemplo.com/x', 'No hubo conexión.');

    expect(result.verdict).toBe('incierto');
    expect(result.degraded).toBe(true);
    expect(result.domain).toBe('ejemplo.com');
    expect(result.riskScore).toBe(50);
    expect(result.sections).toHaveLength(ENABLED_FILTERS.length);
    expect(result.sections[0].findings[0].text).toBe('No hubo conexión.');
  });

  it('nunca produce un veredicto seguro', () => {
    expect(degradedResult('https://x.com', 'y').verdict).not.toBe('seguro');
  });

  it('nunca se queda sin secciones que explicar', () => {
    // Si `ENABLED_FILTERS` quedara vacia, la pantalla de detalle no pintaria
    // ningun acordeon y el usuario no sabria por que fallo el analisis.
    expect(degradedResult('https://x.com', 'motivo').sections.length).toBeGreaterThan(0);
  });
});

describe('secciones que esta version no conoce', () => {
  it('no descarta una seccion desconocida que manda el backend', () => {
    // El backend puede seguir mandando 'preview' (F2.3) aunque la app ya no lo
    // anuncie. El adaptador la pasa tal cual: filtrar datos del backend no es
    // su trabajo, y la pantalla de detalle la omite al pintar.
    const result = adaptAnalysisResponse(
      {
        verdict: 'seguro',
        riskScore: 8,
        sections: [
          {
            key: 'preview' as never,
            title: 'Vista previa',
            badgeText: 'DISPONIBLE',
            badgeTone: 'ok',
            findings: [],
          },
        ],
      },
      'https://x.com',
    );

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].key).toBe('preview');
  });
});

/**
 * El backend calcula el puntaje pero no concluye el veredicto: responde
 * "PENDIENTE" a todo, incluso a google.com. Estas pruebas usan las respuestas
 * REALES capturadas del endpoint el 2026-09-20.
 */
describe('adaptAnalysisResponse · veredicto deducido del puntaje', () => {
  /** Respuesta real del endpoint para 192.168.1.1/login.php. */
  const ipLiteral = {
    url: 'http://192.168.1.1/login.php',
    dominio: '192.168.1.1',
    veredicto_final: 'PENDIENTE',
    filtro_decisivo: null,
    score_heuristico: 60,
    criterios_f2_1: [
      { criterio: 'ip_literal', peso: 30, detalle: 'Host es una IP: 192.168.1.1' },
      { criterio: 'sin_https', peso: 15, detalle: 'La URL no usa HTTPS' },
      { criterio: 'palabra_clave_sospechosa', peso: 15, detalle: 'Palabra detectada: "login"' },
    ],
    indicadores_f2_2: [],
    mensaje: 'F1, F2.1 y F2.2 no concluyentes.',
  };

  /** Respuesta real del endpoint para github.com. */
  const limpio = {
    url: 'https://github.com/',
    dominio: 'github.com',
    veredicto_final: 'PENDIENTE',
    score_heuristico: 0,
    criterios_f2_1: [],
    indicadores_f2_2: [],
  };

  it('deduce "malicioso" de un puntaje alto en vez de rendirse en incierto', () => {
    const result = adaptAnalysisResponse(ipLiteral, 'http://192.168.1.1/login.php');
    expect(result.verdict).toBe('malicioso');
  });

  it('deduce "seguro" cuando no hay ninguna señal', () => {
    expect(adaptAnalysisResponse(limpio, 'https://github.com').verdict).toBe('seguro');
  });

  it('deduce "sospechoso" en el tramo intermedio', () => {
    // banco-lndustrial-seguro.top: TLD de riesgo (25) + sin HTTPS (15) = 40.
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 40, criterios_f2_1: [] },
      'http://banco-lndustrial-seguro.top/acceso',
    );
    expect(result.verdict).toBe('sospechoso');
  });

  it('usa el puntaje del backend como puntaje de riesgo', () => {
    expect(adaptAnalysisResponse(ipLiteral, 'http://192.168.1.1/login.php').riskScore).toBe(60);
  });

  it('un analisis concluido NO se marca degradado', () => {
    // Antes salia el banner de "no pudimos completar todas las verificaciones"
    // en analisis que si se completaron, porque `degraded` miraba si venian
    // secciones en vez de si habia veredicto.
    expect(adaptAnalysisResponse(ipLiteral, 'x').degraded).toBeUndefined();
  });

  it('sin puntaje ni veredicto sigue siendo incierto y degradado', () => {
    const result = adaptAnalysisResponse({ veredicto_final: 'PENDIENTE' }, 'https://x.com');
    expect(result.verdict).toBe('incierto');
    expect(result.degraded).toBe(true);
  });
});

describe('adaptAnalysisResponse · el backend manda sobre la deduccion', () => {
  it('respeta un veredicto real aunque el puntaje diga otra cosa', () => {
    // El dia que Fabi conecte su umbral, su palabra gana: la deduccion se
    // apaga sola sin tocar codigo.
    const result = adaptAnalysisResponse(
      { veredicto_final: 'SEGURO', score_heuristico: 95 },
      'https://x.com',
    );
    expect(result.verdict).toBe('seguro');
  });

  it('respeta un INCIERTO explicito en vez de deducir del puntaje', () => {
    // "INCIERTO" es una conclusion del backend; "PENDIENTE" es que no concluyo.
    const result = adaptAnalysisResponse(
      { veredicto_final: 'INCIERTO', score_heuristico: 0 },
      'https://x.com',
    );
    expect(result.verdict).toBe('incierto');
  });
});

describe('adaptAnalysisResponse · secciones desde los criterios reales', () => {
  const conCriterios = {
    veredicto_final: 'PENDIENTE',
    score_heuristico: 40,
    criterios_f2_1: [
      { criterio: 'tld_riesgo', peso: 25, detalle: 'TLD sospechoso: .top' },
      { criterio: 'sin_https', peso: 15, detalle: 'La URL no usa HTTPS' },
    ],
    indicadores_f2_2: [],
  };

  it('pinta cada criterio del backend como un hallazgo, con su texto y su peso', () => {
    const result = adaptAnalysisResponse(conCriterios, 'http://x.top');

    expect(texts(result, 'heuristics')).toEqual([
      'TLD sospechoso: .top · +25',
      'La URL no usa HTTPS · +15',
    ]);
  });

  it('cuenta las alertas en la insignia', () => {
    expect(section(adaptAnalysisResponse(conCriterios, 'http://x.top'), 'heuristics').badgeText)
      .toBe('2 ALERTAS');
  });

  it('usa el singular con una sola alerta', () => {
    const result = adaptAnalysisResponse(
      { score_heuristico: 15, criterios_f2_1: [{ detalle: 'La URL no usa HTTPS' }] },
      'http://x.com',
    );
    expect(section(result, 'heuristics').badgeText).toBe('1 ALERTA');
    // Sin `peso` no se inventa uno: el texto va solo.
    expect(texts(result, 'heuristics')).toEqual(['La URL no usa HTTPS']);
  });

  it('sin criterios dice que no hubo alertas, no "SIN COMPLETAR"', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 0, criterios_f2_1: [] },
      'https://github.com',
    );

    expect(section(result, 'heuristics').badgeText).toBe('SIN ALERTAS');
    expect(section(result, 'heuristics').badgeTone).toBe('ok');
    expect(section(result, 'heuristics').findings).toHaveLength(1);
  });

  it('ya no aparece "SIN COMPLETAR" cuando el backend si respondio', () => {
    const result = adaptAnalysisResponse(conCriterios, 'http://x.top');
    expect(result.sections.some((s) => s.badgeText === 'SIN COMPLETAR')).toBe(false);
  });
});

/**
 * F2.3: la captura que el backend toma del sitio en su entorno aislado.
 * Aparecio el 2026-09-30. Es una URL firmada de S3 que caduca en una hora.
 */
describe('adaptAnalysisResponse · captura de pantalla (F2.3)', () => {
  const conCaptura = {
    veredicto_final: 'PENDIENTE',
    score_heuristico: 0,
    criterios_f2_1: [],
    screenshot_url: 'https://qrisk-screenshots.s3.amazonaws.com/abc.png?X-Amz-Expires=3600',
  };

  it('conserva la URL de la captura cuando viene', () => {
    const result = adaptAnalysisResponse(conCaptura, 'https://ejemplo.com');
    expect(result.screenshotUrl).toBe(conCaptura.screenshot_url);
  });

  it('omite el campo cuando el backend no la pudo generar', () => {
    // Ausente, no presente-con-undefined: el historial guardaria un campo
    // muerto en cada entrada.
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 0 },
      'https://ejemplo.com',
    );
    expect('screenshotUrl' in result).toBe(false);
  });

  it('ignora una cadena vacia en vez de guardarla', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', screenshot_url: '' },
      'https://ejemplo.com',
    );
    expect('screenshotUrl' in result).toBe(false);
  });

  it('la captura no cambia el veredicto', () => {
    // Es informacion para que la persona mire, no una señal de riesgo.
    expect(adaptAnalysisResponse(conCaptura, 'https://ejemplo.com').verdict).toBe('seguro');
  });
});

/**
 * F2.2: los indicadores de comportamiento, que hoy son VirusTotal.
 *
 * POR QUE ESTE BLOQUE EXISTE. El adaptador declaraba `indicadores_f2_2` en su
 * interfaz y nunca lo leia, asi que la evidencia mas fuerte que produce el
 * sistema no llegaba a la pantalla: un sitio que 18 motores marcan como
 * malicioso se veia con una sola alerta, "La URL no usa HTTPS".
 */
describe('adaptAnalysisResponse · indicadores de comportamiento (F2.2)', () => {
  /**
   * Respuesta LITERAL del endpoint para `malware.wicar.org`, capturada el
   * 2026-10-01. No es inventada: si el backend cambia de forma, este test se
   * cae y avisa.
   */
  const conVirusTotal = {
    url: 'http://malware.wicar.org/data/eicar.com',
    dominio: 'malware.wicar.org',
    veredicto_final: 'SOSPECHOSO',
    filtro_decisivo: 'F2.2',
    score_heuristico: 15,
    criterios_f2_1: [{ criterio: 'sin_https', peso: 15, detalle: 'La URL no usa HTTPS' }],
    indicadores_f2_2: [
      {
        indicador: 'virustotal_motores_maliciosos',
        detalle: '18 motores lo marcan como malicioso',
      },
      {
        indicador: 'virustotal_motores_sospechosos',
        detalle: '1 motores lo marcan como sospechoso',
      },
    ],
  };

  it('muestra los indicadores de VirusTotal, que antes se perdian', () => {
    const result = adaptAnalysisResponse(conVirusTotal, conVirusTotal.url);

    expect(texts(result, 'behavior')).toContain('18 motores lo marcan como malicioso');
  });

  it('separa la estructura del comportamiento, cada una en su filtro', () => {
    const result = adaptAnalysisResponse(conVirusTotal, conVirusTotal.url);

    expect(texts(result, 'heuristics')).toEqual(['La URL no usa HTTPS · +15']);
    // "1 motores" llega asi del backend; se corrige la concordancia.
    expect(texts(result, 'behavior')).toEqual([
      '18 motores lo marcan como malicioso',
      '1 motor lo marca como sospechoso',
    ]);
  });

  it('cada filtro cuenta sus propias alertas en la insignia', () => {
    const result = adaptAnalysisResponse(conVirusTotal, conVirusTotal.url);
    expect(section(result, 'heuristics').badgeText).toBe('1 ALERTA');
    expect(section(result, 'behavior').badgeText).toBe('2 ALERTAS');
  });

  /*
   * CAMBIO DEL 2026-10-12. Este caso antes esperaba 'sospechoso', porque la
   * app respetaba sin excepcion el veredicto del backend.
   *
   * Sigue siendo cierto que mostrar evidencia no es recalcular el veredicto, y
   * que la app nunca REBAJA la palabra del backend. Lo que cambio es que 18
   * motores de VirusTotal ahora ELEVAN: el backend topa en SOSPECHOSO venga de
   * donde venga la señal, asi que este sitio salia con la misma etiqueta que
   * un acortador con 2 motores. Ver `behaviorEscalation`.
   */
  it('18 motores de VirusTotal elevan el veredicto a malicioso', () => {
    const result = adaptAnalysisResponse(conVirusTotal, conVirusTotal.url);
    expect(result.verdict).toBe('malicioso');
  });

  it('el medidor sigue mostrando el puntaje del backend, no uno inventado', () => {
    // La elevacion cambia la ETIQUETA, no el puntaje: el 15 es de la
    // heuristica y se pinta tal cual.
    expect(adaptAnalysisResponse(conVirusTotal, conVirusTotal.url).riskScore).toBe(15);
  });

  it('con indicadores pero sin criterios NO cae en "SIN COMPLETAR"', () => {
    // El backend puede concluir por F2.2 sin que la heuristica marque nada.
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        criterios_f2_1: [],
        indicadores_f2_2: [{ detalle: '5 motores lo marcan como malicioso' }],
      },
      'http://x.com',
    );

    expect(section(result, 'behavior').badgeText).toBe('1 ALERTA');
    expect(texts(result, 'behavior')).toEqual(['5 motores lo marcan como malicioso']);
    expect(section(result, 'heuristics').badgeText).toBe('SIN ALERTAS');
  });

  it('sin la clave de criterios, los indicadores solos bastan para armar su seccion', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'SOSPECHOSO', indicadores_f2_2: [{ detalle: 'algo raro' }] },
      'http://x.com',
    );

    expect(section(result, 'behavior').badgeText).toBe('1 ALERTA');
    expect(texts(result, 'behavior')).toEqual(['algo raro']);
    // De la estructura no llego nada: se dice, sin afirmar que estaba limpia.
    expect(section(result, 'heuristics').badgeText).toBe('SIN COMPLETAR');
    expect(texts(result, 'heuristics')[0]).toContain('no envió');
  });

  it('una lista de indicadores vacia se comporta como antes', () => {
    // No regresion: es el caso de los tres QRs de la demostracion.
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'PENDIENTE',
        score_heuristico: 40,
        criterios_f2_1: [{ detalle: 'TLD sospechoso: .top' }],
        indicadores_f2_2: [],
      },
      'http://x.top',
    );

    expect(section(result, 'heuristics').badgeText).toBe('1 ALERTA');
    expect(section(result, 'behavior').badgeText).toBe('SIN ALERTAS');
    expect(result.verdict).toBe('sospechoso');
  });
});

/**
 * Un puntaje fuera de la escala 0-100 no puede pintar el medidor ni deducir un
 * veredicto: significa que el backend cambio de escala, no que el sitio sea
 * "mas que seguro" o "mas que malicioso".
 */
describe('adaptAnalysisResponse · puntaje fuera de la escala', () => {
  it('un puntaje negativo no produce un falso "seguro"', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: -20 },
      'https://x.com',
    );

    expect(result.verdict).toBe('incierto');
    expect(result.verdict).not.toBe('seguro');
    expect(result.degraded).toBe(true);
  });

  it('no deja el medidor fuera de 0-100', () => {
    // La barra se dibuja sobre 100: un 150 la pintaria desbordada.
    const alto = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 150 },
      'https://x.com',
    );
    const bajo = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: -20 },
      'https://x.com',
    );

    expect(alto.riskScore).toBe(50);
    expect(bajo.riskScore).toBe(50);
  });

  it('tambien sanea el `riskScore` del contrato', () => {
    const result = adaptAnalysisResponse(
      { verdict: 'SOSPECHOSO', riskScore: 999 },
      'https://x.com',
    );
    expect(result.riskScore).toBe(50);
  });

  it('los puntajes validos no se tocan', () => {
    // No regresion: los tres QRs de la demostracion.
    for (const [score, esperado] of [
      [0, 'seguro'],
      [40, 'sospechoso'],
      [60, 'malicioso'],
    ] as const) {
      const r = adaptAnalysisResponse(
        { veredicto_final: 'PENDIENTE', score_heuristico: score },
        'https://x.com',
      );
      expect(r.riskScore).toBe(score);
      expect(r.verdict).toBe(esperado);
    }
  });
});

/**
 * `sections[]` es la forma del contrato que el endpoint todavia no manda. El
 * dia que la mande, lo que llegue se pinta: una seccion mal formada reventaria
 * la pantalla de detalle DESPUES de que la persona escaneo algo.
 */
describe('adaptAnalysisResponse · secciones del backend mal formadas', () => {
  const buena = {
    key: 'reputation',
    title: 'R',
    badgeText: '1 ALERTA',
    badgeTone: 'warn',
    findings: [{ tone: 'warn', text: 'algo' }],
  };

  it('descarta una seccion sin findings utilizables', () => {
    const result = adaptAnalysisResponse(
      {
        verdict: 'SOSPECHOSO',
        sections: [buena, { ...buena, findings: 'no soy un arreglo' }],
      } as never,
      'https://x.com',
    );

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('R');
  });

  it('descarta una seccion con un tono que la app no sabe pintar', () => {
    const result = adaptAnalysisResponse(
      { verdict: 'SOSPECHOSO', sections: [{ ...buena, badgeTone: 'explosivo' }] } as never,
      'https://x.com',
    );

    // Sin secciones utilizables cae al relleno honesto, no a una pantalla rota.
    expect(result.sections.every((s) => s.badgeTone === 'ok' || s.badgeTone === 'warn')).toBe(true);
  });

  it('descarta un hallazgo mal formado dentro de una seccion', () => {
    const result = adaptAnalysisResponse(
      {
        verdict: 'SOSPECHOSO',
        sections: [{ ...buena, findings: [{ tone: 'warn' }] }],
      } as never,
      'https://x.com',
    );

    expect(result.sections.every((s) => s.findings.every((f) => typeof f.text === 'string'))).toBe(
      true,
    );
  });

  it('no se queda sin nada que explicar si todas vienen rotas', () => {
    const result = adaptAnalysisResponse(
      { verdict: 'SOSPECHOSO', sections: [null, 'texto', 42] } as never,
      'https://x.com',
    );

    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.sections[0].findings.length).toBeGreaterThan(0);
  });

  it('una seccion valida pasa intacta', () => {
    // No regresion con la forma del contrato bien formada.
    const result = adaptAnalysisResponse(
      { verdict: 'SOSPECHOSO', sections: [buena] } as never,
      'https://x.com',
    );

    expect(result.sections).toEqual([buena]);
  });
});

/*
 * Casos de la cascada completa que el backend entrego el 2026-10-11. Las
 * respuestas de estos tests son las que devolvio el endpoint en vivo, no
 * ejemplos de la documentacion: se verificaron con curl ese dia.
 */
describe('cascada completa (contrato del 2026-10-11)', () => {
  it('respeta un MALICIOSO que concluye F1, sin mirar el puntaje', () => {
    // Antes del 2026-10-11 el backend nunca devolvia MALICIOSO. Ahora si,
    // cuando la app le manda `resultadoF1`. Respuesta real medida: corte en
    // 5.3 s, sin score ni criterios.
    const result = adaptAnalysisResponse(
      {
        url: 'http://sitio-malo.com/',
        dominio: 'sitio-malo.com',
        veredicto_final: 'MALICIOSO',
        filtro_decisivo: 'F1',
      },
      'http://sitio-malo.com',
    );

    expect(result.verdict).toBe('malicioso');
    // Sin puntaje, el medidor usa el neutro: no se inventa un 100.
    expect(result.riskScore).toBe(50);
    expect(result.degraded).toBeUndefined();
  });

  it('respeta un SEGURO que concluye F1', () => {
    const result = adaptAnalysisResponse(
      {
        url: 'https://google.com/',
        dominio: 'google.com',
        veredicto_final: 'SEGURO',
        filtro_decisivo: 'F1',
      },
      'https://google.com',
    );

    expect(result.verdict).toBe('seguro');
    expect(result.degraded).toBeUndefined();
  });

  it('respeta un SOSPECHOSO de F2.1 aunque el puntaje dijera otra cosa', () => {
    // Score 95 con corte por F2.1. La palabra del backend manda: la app NO
    // recalcula a "malicioso" por tener 95 >= 60.
    const result = adaptAnalysisResponse(
      {
        url: 'http://paypal.com.seguridad-verificacion-cuenta.top/login/verify',
        dominio: 'paypal.com.seguridad-verificacion-cuenta.top',
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.1',
        score_heuristico: 95,
        criterios_f2_1: [
          { criterio: 'tld_riesgo', peso: 25, detalle: 'TLD sospechoso: .top' },
          { criterio: 'sin_https', peso: 15, detalle: 'La URL no usa HTTPS' },
        ],
        indicadores_f2_2: [],
      },
      'http://paypal.com.seguridad-verificacion-cuenta.top/login/verify',
    );

    expect(result.verdict).toBe('sospechoso');
    expect(result.riskScore).toBe(95);
  });

  it('deriva el veredicto cuando F2.1 no alcanza su umbral estricto', () => {
    // Score 55 medido en vivo: el backend corta solo con `score > 60`, asi que
    // tres señales simultaneas devuelven PENDIENTE. Sin la derivacion, esta URL
    // se veria "incierta" con la evidencia a la vista.
    const result = adaptAnalysisResponse(
      {
        url: 'http://mi-banco-verificacion.xyz/login?token=abc',
        dominio: 'mi-banco-verificacion.xyz',
        veredicto_final: 'PENDIENTE',
        filtro_decisivo: null,
        score_heuristico: 55,
        criterios_f2_1: [
          { criterio: 'tld_riesgo', peso: 25, detalle: 'TLD sospechoso: .xyz' },
          { criterio: 'sin_https', peso: 15, detalle: 'La URL no usa HTTPS' },
          { criterio: 'palabra_clave_sospechosa', peso: 15, detalle: 'Palabra detectada: "login"' },
        ],
        indicadores_f2_2: [
          { indicador: 'virustotal_motores_sospechosos', detalle: '1 motores lo marcan como sospechoso' },
        ],
      },
      'http://mi-banco-verificacion.xyz/login?token=abc',
    );

    expect(result.verdict).toBe('sospechoso');
    // Cada lista en su filtro: 3 criterios en la estructura, 1 indicador en el
    // comportamiento.
    expect(section(result, 'heuristics').badgeText).toBe('3 ALERTAS');
    expect(texts(result, 'behavior')).toEqual(['1 motor lo marca como sospechoso']);
  });

  it('acepta un corte por F2.2 sin criterios de F2.1 relevantes', () => {
    // Acortador: score 20 (no concluye F2.1) pero VirusTotal si. Respuesta
    // real medida en 28.1 s, con captura.
    const result = adaptAnalysisResponse(
      {
        url: 'https://tinyurl.com/2p8x9k3j',
        dominio: 'tinyurl.com',
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.2',
        score_heuristico: 20,
        criterios_f2_1: [
          {
            criterio: 'acortador_url_conocido',
            peso: 20,
            detalle: 'Dominio es un acortador de URL conocido: tinyurl.com',
          },
        ],
        indicadores_f2_2: [
          { indicador: 'virustotal_motores_maliciosos', detalle: '2 motores lo marcan como malicioso' },
        ],
        screenshot_url: 'https://bucket.s3.amazonaws.com/shot.png?X-Amz-Expires=3600',
      },
      'https://tinyurl.com/2p8x9k3j',
    );

    expect(result.verdict).toBe('sospechoso');
    expect(result.screenshotUrl).toContain('shot.png');
    expect(texts(result, 'heuristics')).toEqual([
      'Dominio es un acortador de URL conocido: tinyurl.com · +20',
    ]);
    expect(texts(result, 'behavior')).toEqual(['2 motores lo marcan como malicioso']);
  });

  it('un corte temprano por F2.1 sin captura no se trata como fallo', () => {
    // Verificado: cuando F2.1 corta con score alto, el backend NO genera
    // captura porque la cascada no llego a F2.2. Eso no es degradacion.
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.1',
        score_heuristico: 95,
        criterios_f2_1: [{ criterio: 'tld_riesgo', peso: 25, detalle: 'TLD sospechoso: .top' }],
        indicadores_f2_2: [],
      },
      'http://x.top/login',
    );

    expect(result.screenshotUrl).toBeUndefined();
    expect(result.degraded).toBeUndefined();
  });

  it('no se rompe con desde_cache: es informativo', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.2',
        score_heuristico: 20,
        criterios_f2_1: [],
        indicadores_f2_2: [{ indicador: 'virustotal_motores_maliciosos', detalle: '2 motores' }],
        desde_cache: true,
      },
      'https://tinyurl.com/x',
    );

    expect(result.verdict).toBe('sospechoso');
    expect(section(result, 'behavior').findings).toHaveLength(1);
  });

  it('acepta indicadores que solo traen `indicador`, sin peso', () => {
    // Los indicadores de F2.2 no puntuan: concluyen. No traen `peso` y eso no
    // debe impedir que se pinten.
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        criterios_f2_1: [],
        indicadores_f2_2: [
          { indicador: 'urlscan_verdict_malicioso', detalle: 'URLScan lo marca como malicioso' },
          { indicador: 'urlscan_scan_eliminado', detalle: 'El scan fue eliminado tras analizarlo' },
          { indicador: 'redireccion_detectada', detalle: 'Se detecto una redireccion' },
        ],
      },
      'https://x.com',
    );

    expect(section(result, 'behavior').findings).toHaveLength(3);
    expect(section(result, 'behavior').findings.every((f) => f.tone === 'warn')).toBe(true);
  });
});

/*
 * El corte anticipado de la cascada no es un fallo del analisis, y la pantalla
 * no debe decir que algo quedo sin revisar. Era un bug real: un SEGURO de F1
 * se veia con el acordeon "SIN COMPLETAR" y el texto "esta parte no pudo
 * revisarse", justo debajo de un veredicto favorable.
 */
describe('corte anticipado por F1', () => {
  const f1Response = (verdict: string) => ({
    url: 'https://x.com/',
    dominio: 'x.com',
    veredicto_final: verdict,
    filtro_decisivo: 'F1',
  });

  it('un SEGURO de F1 no se ve como analisis incompleto', () => {
    const result = adaptAnalysisResponse(f1Response('SEGURO'), 'https://x.com');

    expect(section(result, 'reputation').badgeText).toBe('CONFIABLE');
    expect(section(result, 'reputation').badgeTone).toBe('ok');
    expect(result.sections.some((s) => s.badgeText === 'SIN COMPLETAR')).toBe(false);
  });

  it('los filtros siguientes dicen que no corrieron, y por que', () => {
    const result = adaptAnalysisResponse(f1Response('SEGURO'), 'https://x.com');

    for (const key of ['heuristics', 'behavior'] as const) {
      expect(section(result, key).badgeText).toBe('NO CORRIÓ');
      expect(section(result, key).badgeTone).toBe('ok');
      expect(texts(result, key)[0]).toContain('la reputación ya decidió');
    }
  });

  it('explica por que no hay lista de señales', () => {
    const result = adaptAnalysisResponse(f1Response('SEGURO'), 'https://x.com');
    expect(result.sections[0].findings[0].text).toContain('reputación');
  });

  it('un MALICIOSO de F1 se muestra en tono de advertencia', () => {
    // Es la conclusion MAS firme que el sistema puede emitir: no puede
    // pintarse en verde por no traer criterios que enumerar.
    const result = adaptAnalysisResponse(f1Response('MALICIOSO'), 'https://x.com');

    expect(result.verdict).toBe('malicioso');
    expect(section(result, 'reputation').badgeTone).toBe('warn');
    expect(section(result, 'reputation').findings[0].tone).toBe('warn');
    expect(texts(result, 'reputation')[0]).toContain('peligrosa');
  });

  it('no se marca degradado: la cascada hizo lo que debia', () => {
    expect(adaptAnalysisResponse(f1Response('SEGURO'), 'https://x.com').degraded).toBeUndefined();
    expect(adaptAnalysisResponse(f1Response('MALICIOSO'), 'https://x.com').degraded).toBeUndefined();
  });

  it('un PENDIENTE sin criterios SI es analisis incompleto', () => {
    // La otra cara: si el backend no concluyo Y no mando señales, entonces si
    // corresponde decir que no se pudo revisar.
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', filtro_decisivo: null },
      'https://x.com',
    );

    expect(result.verdict).toBe('incierto');
    expect(result.sections[0].badgeText).toBe('SIN COMPLETAR');
    expect(result.degraded).toBe(true);
  });
});

/*
 * La app eleva a malicioso cuando la evidencia de F2.2 lo justifica, porque el
 * backend topa en SOSPECHOSO venga de donde venga la señal: un sitio con 18
 * motores de VirusTotal salia con la misma etiqueta que uno con 2.
 */
describe('elevacion por evidencia de comportamiento', () => {
  const sospechoso = (indicadores: unknown[]) => ({
    url: 'https://x.test/',
    dominio: 'x.test',
    veredicto_final: 'SOSPECHOSO',
    filtro_decisivo: 'F2.2',
    score_heuristico: 20,
    criterios_f2_1: [],
    indicadores_f2_2: indicadores,
  });

  it('eleva a malicioso con 3 o mas motores', () => {
    const result = adaptAnalysisResponse(
      sospechoso([
        { indicador: 'virustotal_motores_maliciosos', detalle: '18 motores lo marcan como malicioso' },
      ]) as never,
      'https://x.test/',
    );

    expect(result.verdict).toBe('malicioso');
    // El resumen tiene que corresponder al veredicto nuevo, no al viejo.
    expect(result.summary).toContain('peligroso');
  });

  it('deja en sospechoso con 2 motores', () => {
    const result = adaptAnalysisResponse(
      sospechoso([
        { indicador: 'virustotal_motores_maliciosos', detalle: '2 motores lo marcan como malicioso' },
      ]) as never,
      'https://x.test/',
    );

    expect(result.verdict).toBe('sospechoso');
  });

  it('la evidencia que elevo sigue visible en pantalla', () => {
    // Elevar sin mostrar por que seria pedirle a la persona que confie.
    const result = adaptAnalysisResponse(
      sospechoso([
        { indicador: 'virustotal_motores_maliciosos', detalle: '18 motores lo marcan como malicioso' },
      ]) as never,
      'https://x.test/',
    );

    expect(texts(result, 'behavior')).toContain('18 motores lo marcan como malicioso');
  });

  /*
   * SOLO ELEVA, NUNCA REBAJA. Si el backend concluyo SEGURO, resolver la
   * contradiccion rebajando su palabra no le toca a la app.
   */
  it('no toca un SEGURO del backend', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SEGURO',
        filtro_decisivo: 'F1',
        indicadores_f2_2: [
          { indicador: 'virustotal_motores_maliciosos', detalle: '9 motores lo marcan' },
        ],
      } as never,
      'https://x.test/',
    );

    expect(result.verdict).toBe('seguro');
  });

  it('un MALICIOSO del backend sigue siendo malicioso', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'MALICIOSO', filtro_decisivo: 'F1' } as never,
      'https://x.test/',
    );

    expect(result.verdict).toBe('malicioso');
  });

  it('no eleva un incierto: sin veredicto no hay nada que elevar', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'PENDIENTE',
        filtro_decisivo: null,
        indicadores_f2_2: [
          { indicador: 'virustotal_motores_maliciosos', detalle: '9 motores lo marcan' },
        ],
      } as never,
      'https://x.test/',
    );

    // Sin score no se puede derivar, asi que queda incierto y la elevacion no
    // aplica: elevar un "no sé" a "malicioso" seria inventar.
    expect(result.verdict).toBe('incierto');
  });

  it('eleva tambien cuando el veredicto sospechoso venia derivado del puntaje', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'PENDIENTE',
        filtro_decisivo: null,
        score_heuristico: 40,
        criterios_f2_1: [{ criterio: 'tld_riesgo', peso: 25, detalle: 'TLD sospechoso: .tk' }],
        indicadores_f2_2: [
          { indicador: 'urlscan_verdict_malicioso', detalle: 'URLScan lo marca como malicioso' },
        ],
      } as never,
      'https://x.test/',
    );

    expect(result.verdict).toBe('malicioso');
  });
});

/*
 * DESGLOSE POR FILTRO Y "POR QUE ESTE VEREDICTO".
 *
 * Se reporto en pruebas que la pantalla de detalle no explicaba el veredicto:
 * F1 no aparecia, las señales de F2.1 y F2.2 salian mezcladas en una lista sin
 * pesos, y nada decia que umbral se habia aplicado. Estos tests fijan lo que la
 * persona tiene que poder leer en cada camino de la cascada.
 */
describe('desglose · reputacion (F1) con lo que consulto la app', () => {
  const f1 = (over: Partial<F1Outcome> = {}): F1Outcome => ({
    verdict: 'INCIERTO',
    source: 'ninguna',
    elapsedMs: 120,
    localTrusted: false,
    safeBrowsing: { status: 'not_listed' },
    phishTank: { status: 'not_listed' },
    ...over,
  });
  const cutByF1 = (verdict: string) => ({ veredicto_final: verdict, filtro_decisivo: 'F1' });
  const cascade = {
    veredicto_final: 'PENDIENTE',
    filtro_decisivo: null,
    score_heuristico: 0,
    criterios_f2_1: [],
    indicadores_f2_2: [],
  };

  it('nombra a Google Safe Browsing y el tipo de amenaza cuando la tiene reportada', () => {
    const result = adaptAnalysisResponse(
      cutByF1('MALICIOSO'),
      'http://malo.test/login',
      f1({
        verdict: 'MALICIOSO',
        source: 'safe_browsing',
        safeBrowsing: { status: 'listed', threatType: 'SOCIAL_ENGINEERING' },
      }),
    );

    expect(texts(result, 'reputation')).toEqual([
      'Google Safe Browsing la tiene reportada como phishing.',
      'PhishTank no la tiene confirmada como phishing.',
    ]);
    expect(section(result, 'reputation').badgeText).toBe('REPORTADA');
    expect(result.verdictReason).toContain('Google Safe Browsing la tiene reportada como phishing');
  });

  it('dice "malware" cuando ese es el tipo de amenaza', () => {
    const result = adaptAnalysisResponse(
      cutByF1('MALICIOSO'),
      'http://malo.test/x.exe',
      f1({ verdict: 'MALICIOSO', safeBrowsing: { status: 'listed', threatType: 'MALWARE' } }),
    );
    expect(texts(result, 'reputation')[0]).toContain('como malware');
  });

  it('separa la lista de confianza de la consulta a Safe Browsing', () => {
    const result = adaptAnalysisResponse(
      { ...cutByF1('SEGURO'), dominio: 'github.com' },
      'https://github.com/x',
      f1({ verdict: 'SEGURO', source: 'lista_local', localTrusted: true }),
    );

    expect(texts(result, 'reputation')).toEqual([
      'github.com está en la lista de confianza de QRisk.',
      'Google Safe Browsing no la tiene reportada.',
      'PhishTank no la tiene confirmada como phishing.',
    ]);
    expect(section(result, 'reputation').badgeText).toBe('CONFIABLE');
    expect(result.verdictReason).toBe(
      'Seguro: github.com está en la lista de confianza de QRisk y ni Google Safe Browsing ni PhishTank tienen reportada esta URL.',
    );
  });

  it('cuando la cascada sigue, dice que ninguna lista la tiene reportada', () => {
    const result = adaptAnalysisResponse(cascade, 'https://x.test', f1());

    expect(texts(result, 'reputation')).toEqual([
      'Google Safe Browsing no la tiene reportada.',
      'PhishTank no la tiene confirmada como phishing.',
    ]);
    expect(section(result, 'reputation').badgeText).toBe('SIN REPORTES');
  });

  /*
   * Decir "no la tiene reportada" cuando la consulta no se pudo hacer seria
   * afirmar algo que nadie verifico.
   */
  it('no dice "no la tiene reportada" si Safe Browsing no respondio', () => {
    const result = adaptAnalysisResponse(
      cascade,
      'https://x.test',
      f1({ safeBrowsing: { status: 'unavailable' } }),
    );

    expect(texts(result, 'reputation')).toEqual([
      'No se pudo consultar Google Safe Browsing: no respondió a tiempo.',
      'PhishTank no la tiene confirmada como phishing.',
    ]);
    // Una de las dos respondio: la consulta fue parcial, no nula.
    expect(section(result, 'reputation').badgeText).toBe('CONSULTA PARCIAL');
  });

  it('dice cuando esta version no consulta Safe Browsing', () => {
    const result = adaptAnalysisResponse(
      cascade,
      'https://x.test',
      f1({ safeBrowsing: { status: 'not_configured' } }),
    );
    expect(texts(result, 'reputation')[0]).toContain('no consulta Google Safe Browsing');
  });

  it('explica un corte por F1 que salio de la cache del servidor', () => {
    // La app mando INCIERTO pero el backend respondio con un F1 guardado.
    const result = adaptAnalysisResponse(cutByF1('MALICIOSO'), 'https://x.test', f1());

    expect(section(result, 'reputation').footnote).toContain('análisis anterior');
    expect(result.verdictReason).toContain('las listas de reputación la tienen reportada');
  });

  it('nombra a PhishTank cuando es quien la confirma', () => {
    const result = adaptAnalysisResponse(
      cutByF1('MALICIOSO'),
      'http://allegrolokalnie.078259.top',
      f1({ verdict: 'MALICIOSO', source: 'phishtank', phishTank: { status: 'listed' } }),
    );

    expect(texts(result, 'reputation')).toEqual([
      'Google Safe Browsing no la tiene reportada.',
      'PhishTank la tiene confirmada como phishing: su comunidad verificó el reporte.',
    ]);
    expect(section(result, 'reputation').badgeText).toBe('REPORTADA');
    expect(result.verdictReason).toBe(
      'Malicioso: PhishTank la tiene confirmada como phishing. Ese reporte basta, así que no se corrieron los demás filtros.',
    );
  });

  it('si las dos listas la reportan, el porque nombra a las dos', () => {
    const result = adaptAnalysisResponse(
      cutByF1('MALICIOSO'),
      'http://malo.test',
      f1({
        verdict: 'MALICIOSO',
        source: 'safe_browsing',
        safeBrowsing: { status: 'listed', threatType: 'SOCIAL_ENGINEERING' },
        phishTank: { status: 'listed' },
      }),
    );
    expect(result.verdictReason).toContain(
      'Google Safe Browsing la tiene reportada como phishing y PhishTank la tiene confirmada como phishing',
    );
  });

  it('un SEGURO por confianza no afirma lo que PhishTank no respondio', () => {
    const result = adaptAnalysisResponse(
      { ...cutByF1('SEGURO'), dominio: 'github.com' },
      'https://github.com/x',
      f1({
        verdict: 'SEGURO',
        source: 'lista_local',
        localTrusted: true,
        phishTank: { status: 'unavailable' },
      }),
    );

    expect(texts(result, 'reputation')).toContain(
      'No se pudo consultar PhishTank: no respondió a tiempo.',
    );
    expect(result.verdictReason).toBe(
      'Seguro: github.com está en la lista de confianza de QRisk y Google Safe Browsing no tiene reportada esta URL. No se pudo consultar PhishTank.',
    );
  });

  it('sin respuesta de ninguna lista la reputacion queda sin completar', () => {
    const result = adaptAnalysisResponse(
      cascade,
      'https://x.test',
      f1({ safeBrowsing: { status: 'unavailable' }, phishTank: { status: 'unavailable' } }),
    );
    expect(section(result, 'reputation').badgeText).toBe('SIN COMPLETAR');
  });

  it('sin clave de Safe Browsing, PhishTank solo basta para "sin reportes"', () => {
    const result = adaptAnalysisResponse(
      cascade,
      'https://x.test',
      f1({ safeBrowsing: { status: 'not_configured' } }),
    );
    expect(section(result, 'reputation').badgeText).toBe('SIN REPORTES');
  });

  it('el resultado degradado conserva lo que F1 si alcanzo a consultar', () => {
    const result = degradedResult('https://x.test', 'No hubo conexión.', f1());

    expect(texts(result, 'reputation')).toEqual([
      'Google Safe Browsing no la tiene reportada.',
      'PhishTank no la tiene confirmada como phishing.',
    ]);
    expect(texts(result, 'heuristics')).toEqual(['No hubo conexión.']);
    expect(result.verdict).toBe('incierto');
  });
});

describe('desglose · filtros que no corrieron', () => {
  it('un corte por F2.1 deja el comportamiento en "NO CORRIÓ"', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.1',
        score_heuristico: 95,
        criterios_f2_1: [{ criterio: 'tld_riesgo', peso: 25, detalle: 'TLD sospechoso: .top' }],
        indicadores_f2_2: [],
      },
      'http://x.top/login',
    );

    expect(section(result, 'behavior').badgeText).toBe('NO CORRIÓ');
    expect(texts(result, 'behavior')[0]).toContain('la estructura del enlace ya superó');
    expect(section(result, 'heuristics').footnote).toBe('Puntaje de la estructura: 95 de 100.');
  });
});

describe('desglose · por que este veredicto', () => {
  it('explica un sospechoso de F2.1 con el corte del servidor', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.1',
        score_heuristico: 95,
        criterios_f2_1: [],
      },
      'http://x.top',
    );
    expect(result.verdictReason).toBe(
      'Sospechoso: la estructura del enlace sumó 95 de 100 puntos, por encima del corte del servidor (más de 60).',
    );
  });

  it('explica un veredicto deducido del puntaje con los cortes de la app', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 40, criterios_f2_1: [], indicadores_f2_2: [] },
      'http://x.test',
    );
    expect(result.verdictReason).toBe(
      'Sospechoso: la estructura del enlace sumó 40 de 100 puntos. QRisk marca sospechoso desde 30 y malicioso desde 60.',
    );
  });

  it('un seguro deducido dice que tampoco hubo reportes de comportamiento', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 0, criterios_f2_1: [], indicadores_f2_2: [] },
      'http://x.test',
    );
    expect(result.verdictReason).toBe(
      'Seguro: la estructura del enlace sumó 0 de 100 puntos (QRisk marca sospechoso desde 30) y no llegaron reportes de VirusTotal ni de URLScan.io.',
    );
  });

  it('dice que la app elevo lo que el servidor dejo en sospechoso', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.2',
        score_heuristico: 30,
        criterios_f2_1: [],
        indicadores_f2_2: [
          { indicador: 'virustotal_motores_maliciosos', detalle: '3 motores lo marcan como malicioso' },
        ],
      },
      'http://x.test',
    );

    expect(result.verdict).toBe('malicioso');
    expect(result.verdictReason).toBe(
      'Malicioso: 3 motores de VirusTotal lo marcan como malicioso, y QRisk lo considera malicioso desde 3. El servidor lo había dejado en sospechoso.',
    );
  });

  it('explica por que 1 motor no alcanza para malicioso', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.2',
        score_heuristico: 15,
        criterios_f2_1: [],
        indicadores_f2_2: [
          { indicador: 'virustotal_motores_maliciosos', detalle: '1 motores lo marcan como malicioso' },
        ],
      },
      'http://x.test',
    );

    expect(result.verdictReason).toBe(
      'Sospechoso: 1 motor de VirusTotal lo marca como malicioso. QRisk lo considera malicioso desde 3 motores.',
    );
  });

  it('nombra la eliminacion del informe de URLScan cuando es lo que elevo', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'SOSPECHOSO',
        filtro_decisivo: 'F2.2',
        criterios_f2_1: [],
        indicadores_f2_2: [{ indicador: 'urlscan_scan_eliminado', detalle: 'Scan eliminado' }],
      },
      'http://x.test',
    );
    expect(result.verdictReason).toContain('URLScan.io eliminó su informe');
  });

  it('un incierto dice que no hay base para concluir', () => {
    const result = adaptAnalysisResponse({ veredicto_final: 'PENDIENTE' }, 'http://x.test');
    expect(result.verdictReason).toContain('Incierto: el análisis no se completó');
  });

  it('avisa cuando el resultado viene de la cache del servidor', () => {
    const result = adaptAnalysisResponse(
      {
        veredicto_final: 'PENDIENTE',
        score_heuristico: 0,
        criterios_f2_1: [],
        indicadores_f2_2: [],
        desde_cache: true,
      },
      'http://x.test',
    );
    expect(result.verdictReason).toContain('análisis anterior de esta misma URL');
  });
});

/*
 * Antes un corte por F1 pintaba el medidor en 50/100 tanto para un SEGURO como
 * para un MALICIOSO: un relleno con aspecto de medicion.
 */
describe('medidor · solo cuando hay puntaje', () => {
  it('sin puntaje marca el medidor como relleno', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'MALICIOSO', filtro_decisivo: 'F1' },
      'http://x.test',
    );
    expect(result.riskScoreMissing).toBe(true);
  });

  it('con puntaje no marca nada', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 40, criterios_f2_1: [] },
      'http://x.test',
    );
    expect('riskScoreMissing' in result).toBe(false);
    expect(result.riskScore).toBe(40);
  });

  it('un puntaje fuera de escala cuenta como ausente', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 150 },
      'http://x.test',
    );
    expect(result.riskScoreMissing).toBe(true);
  });

  it('el resultado degradado tampoco pinta el medidor', () => {
    expect(degradedResult('https://x.test', 'motivo').riskScoreMissing).toBe(true);
  });
});

describe('fixEngineGrammar', () => {
  it('corrige el singular que el backend redacta en plural', () => {
    expect(fixEngineGrammar('1 motores lo marcan como malicioso')).toBe(
      '1 motor lo marca como malicioso',
    );
  });

  it('no toca los plurales correctos', () => {
    expect(fixEngineGrammar('11 motores lo marcan como malicioso')).toBe(
      '11 motores lo marcan como malicioso',
    );
    expect(fixEngineGrammar('21 motores lo marcan')).toBe('21 motores lo marcan');
  });

  it('corrige "1 motores" aunque no siga "lo marcan"', () => {
    expect(fixEngineGrammar('Detectado por 1 motores')).toBe('Detectado por 1 motor');
  });
});
