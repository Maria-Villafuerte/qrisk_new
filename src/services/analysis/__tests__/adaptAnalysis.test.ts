import {
  adaptAnalysisResponse,
  degradedResult,
  domainFromUrl,
  mapVerdict,
} from '../adaptAnalysis';
import { ENABLED_FILTERS } from '../enabledFilters';

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
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.sections[0].title).toBe('Reputación');
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
  };

  it('pinta cada criterio del backend como un hallazgo, con su texto', () => {
    const result = adaptAnalysisResponse(conCriterios, 'http://x.top');

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].findings.map((f) => f.text)).toEqual([
      'TLD sospechoso: .top',
      'La URL no usa HTTPS',
    ]);
  });

  it('cuenta las alertas en la insignia', () => {
    expect(adaptAnalysisResponse(conCriterios, 'http://x.top').sections[0].badgeText)
      .toBe('2 ALERTAS');
  });

  it('usa el singular con una sola alerta', () => {
    const result = adaptAnalysisResponse(
      { score_heuristico: 15, criterios_f2_1: [{ detalle: 'La URL no usa HTTPS' }] },
      'http://x.com',
    );
    expect(result.sections[0].badgeText).toBe('1 ALERTA');
  });

  it('sin criterios dice que no hubo alertas, no "SIN COMPLETAR"', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'PENDIENTE', score_heuristico: 0, criterios_f2_1: [] },
      'https://github.com',
    );

    expect(result.sections[0].badgeText).toBe('SIN ALERTAS');
    expect(result.sections[0].badgeTone).toBe('ok');
    expect(result.sections[0].findings).toHaveLength(1);
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
