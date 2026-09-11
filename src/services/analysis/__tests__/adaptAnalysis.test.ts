import {
  adaptAnalysisResponse,
  degradedResult,
  domainFromUrl,
  mapVerdict,
} from '../adaptAnalysis';

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

  it('rellena las tres secciones en vez de omitirlas', () => {
    const result = adaptAnalysisResponse(real, 'https://ejemplo.com');
    // 'preview' (F2.3) no esta implementado en el backend, asi que la app no
    // lo anuncia: solo se rellenan los tres filtros que si existen.
    expect(result.sections.map((s) => s.key)).toEqual([
      'reputation',
      'heuristics',
      'behavior',
    ]);
    // El contrato lo exige: nunca se omite una seccion en silencio.
    expect(result.sections.every((s) => s.badgeTone === 'warn')).toBe(true);
    expect(result.sections.every((s) => s.findings.length > 0)).toBe(true);
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
    expect(result.sections).toHaveLength(3);
    expect(result.sections[0].findings[0].text).toBe('No hubo conexión.');
  });

  it('nunca produce un veredicto seguro', () => {
    expect(degradedResult('https://x.com', 'y').verdict).not.toBe('seguro');
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
