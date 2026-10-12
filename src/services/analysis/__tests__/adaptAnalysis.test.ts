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
    // Mismo titulo que la seccion completada: no puede cambiar de nombre
    // segun si el analisis llego al final o no.
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    expect(result.sections[0].title).toBe('Análisis del enlace');
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

    expect(result.sections[0].findings.map((f) => f.text)).toContain(
      '18 motores lo marcan como malicioso',
    );
  });

  it('pinta las dos listas juntas: primero la heuristica, luego el comportamiento', () => {
    const result = adaptAnalysisResponse(conVirusTotal, conVirusTotal.url);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].findings.map((f) => f.text)).toEqual([
      'La URL no usa HTTPS',
      '18 motores lo marcan como malicioso',
      '1 motores lo marcan como sospechoso',
    ]);
  });

  it('cuenta los indicadores en la insignia junto con los criterios', () => {
    // Antes decia "1 ALERTA" teniendo tres señales que mostrar.
    expect(adaptAnalysisResponse(conVirusTotal, conVirusTotal.url).sections[0].badgeText)
      .toBe('3 ALERTAS');
  });

  it('el veredicto lo sigue decidiendo el backend, no los indicadores', () => {
    // Mostrar mas evidencia no es recalcular el veredicto: el backend dijo
    // SOSPECHOSO y su palabra manda (ver `backendConcluded`).
    const result = adaptAnalysisResponse(conVirusTotal, conVirusTotal.url);
    expect(result.verdict).toBe('sospechoso');
    expect(result.riskScore).toBe(15);
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

    expect(result.sections[0].badgeText).toBe('1 ALERTA');
    expect(result.sections[0].findings.map((f) => f.text)).toEqual([
      '5 motores lo marcan como malicioso',
    ]);
  });

  it('sin la clave de criterios, los indicadores solos bastan para armar la seccion', () => {
    const result = adaptAnalysisResponse(
      { veredicto_final: 'SOSPECHOSO', indicadores_f2_2: [{ detalle: 'algo raro' }] },
      'http://x.com',
    );

    expect(result.sections.some((s) => s.badgeText === 'SIN COMPLETAR')).toBe(false);
    expect(result.sections[0].findings.map((f) => f.text)).toEqual(['algo raro']);
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

    expect(result.sections[0].badgeText).toBe('1 ALERTA');
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
    // Las dos listas se pintan juntas: 3 criterios + 1 indicador.
    expect(result.sections[0].findings).toHaveLength(4);
    expect(result.sections[0].badgeText).toBe('4 ALERTAS');
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
    expect(result.sections[0].findings.map((f) => f.text)).toEqual([
      'Dominio es un acortador de URL conocido: tinyurl.com',
      '2 motores lo marcan como malicioso',
    ]);
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
    expect(result.sections[0].findings).toHaveLength(1);
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

    expect(result.sections[0].findings).toHaveLength(3);
    expect(result.sections[0].findings.every((f) => f.tone === 'warn')).toBe(true);
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

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].badgeText).toBe('SIN ALERTAS');
    expect(result.sections[0].badgeTone).toBe('ok');
    expect(result.sections[0].findings[0].text).not.toContain('no pudo revisarse');
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
    expect(result.sections[0].badgeTone).toBe('warn');
    expect(result.sections[0].findings[0].tone).toBe('warn');
    expect(result.sections[0].findings[0].text).toContain('peligroso');
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
