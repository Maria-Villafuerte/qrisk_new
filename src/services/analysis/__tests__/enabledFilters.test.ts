import { ENABLED_FILTERS, isFilterEnabled } from '../enabledFilters';

/**
 * Que filtros anuncia esta version. Es una decision de producto, no un detalle:
 * si se enciende un filtro que el backend no responde, el usuario ve un
 * acordeon "SIN COMPLETAR" que nunca se completa.
 *
 * Este es el UNICO sitio que fija el literal `['reputation']`. Cuando Fabi
 * entregue F2.1 o F2.2 y se descomente su linea, este test falla y recuerda
 * actualizarlo: es el recordatorio, no un estorbo.
 */
describe('ENABLED_FILTERS', () => {
  it('hoy corre solo F1 (reputacion)', () => {
    expect(ENABLED_FILTERS).toEqual(['reputation']);
  });

  // El backend SI implementa F2.1 y F2.2 (verificado el 2026-10-01). Lo que no
  // hace es reportarlos como etapas separadas, que es lo que haria falta para
  // anunciarlos aqui. Sus señales se muestran igual, dentro de la seccion
  // activa: ver el adaptador y los tests de indicadores de F2.2.
  it('no los anuncia por separado: el backend no los reporta como etapas', () => {
    expect(ENABLED_FILTERS).not.toContain('heuristics');
    expect(ENABLED_FILTERS).not.toContain('behavior');
  });

  it('nunca esta vacia: sin filtros no hay analisis que mostrar', () => {
    expect(ENABLED_FILTERS.length).toBeGreaterThan(0);
  });
});

describe('isFilterEnabled', () => {
  it('reconoce el filtro activo', () => {
    expect(isFilterEnabled('reputation')).toBe(true);
  });

  it('rechaza los filtros apagados', () => {
    expect(isFilterEnabled('heuristics')).toBe(false);
    expect(isFilterEnabled('behavior')).toBe(false);
  });

  it('rechaza una clave que la app no conoce', () => {
    // El backend puede mandar 'preview' (F2.3). No esta en el tipo, pero en
    // tiempo de ejecucion llega igual y no debe colarse a la pantalla.
    expect(isFilterEnabled('preview' as never)).toBe(false);
  });
});
