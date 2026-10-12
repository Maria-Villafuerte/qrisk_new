import { ENABLED_FILTERS, isFilterEnabled } from '../enabledFilters';

/**
 * Que filtros anuncia esta version. Es una decision de producto, no un detalle:
 * si se enciende un filtro que el backend no responde, el usuario ve un
 * acordeon "SIN COMPLETAR" que nunca se completa.
 *
 * Este es el UNICO sitio que fija la lista completa como literal. Si alguien
 * enciende o apaga un filtro, este test falla y recuerda revisar tambien
 * `analysisStages` (la pantalla de carga): los dos tienen que ir juntos.
 */
describe('ENABLED_FILTERS', () => {
  /*
   * Las tres etapas estan activas desde el 2026-10-11, cuando el backend
   * entrego la cascada completa (F1 + F2.1 + F2.2 + F2.3) e informa cual filtro
   * decidio en `filtro_decisivo`. Antes se anunciaba solo 'reputation', porque
   * la respuesta era plana y no habia etapas distinguibles que mostrar.
   */
  it('corre la cascada completa: F1, F2.1 y F2.2', () => {
    expect(ENABLED_FILTERS).toEqual(['reputation', 'heuristics', 'behavior']);
  });

  it('las anuncia en el orden de la cascada', () => {
    expect(ENABLED_FILTERS.indexOf('reputation')).toBeLessThan(
      ENABLED_FILTERS.indexOf('heuristics'),
    );
    expect(ENABLED_FILTERS.indexOf('heuristics')).toBeLessThan(
      ENABLED_FILTERS.indexOf('behavior'),
    );
  });

  /*
   * F2.3 no es una etapa: es un subproducto de F2.2. El backend genera la
   * captura dentro de esa etapa y la manda en `screenshot_url` cuando pudo.
   * Verificado el 2026-10-11: un corte por F2.1 con score alto no trae
   * captura, porque la cascada no llego a F2.2. Darle etapa propia anunciaria
   * un paso que no siempre ocurre.
   */
  it('no anuncia F2.3 como etapa: es un subproducto de F2.2', () => {
    expect(ENABLED_FILTERS).not.toContain('preview');
  });

  it('nunca esta vacia: sin filtros no hay analisis que mostrar', () => {
    expect(ENABLED_FILTERS.length).toBeGreaterThan(0);
  });

  it('no repite ninguna clave', () => {
    expect(new Set(ENABLED_FILTERS).size).toBe(ENABLED_FILTERS.length);
  });
});

describe('isFilterEnabled', () => {
  it('reconoce los tres filtros activos', () => {
    expect(isFilterEnabled('reputation')).toBe(true);
    expect(isFilterEnabled('heuristics')).toBe(true);
    expect(isFilterEnabled('behavior')).toBe(true);
  });

  it('rechaza una clave que la app no conoce', () => {
    // El backend puede mandar 'preview' (F2.3). No esta en el tipo, pero en
    // tiempo de ejecucion llega igual y no debe colarse a la pantalla.
    expect(isFilterEnabled('preview' as never)).toBe(false);
  });
});
