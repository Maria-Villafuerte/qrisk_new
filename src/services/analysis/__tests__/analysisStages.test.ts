import { analysisStages } from '../analysisStages';
import { ENABLED_FILTERS } from '../enabledFilters';

/**
 * La pantalla de carga pinta una fila por etapa y cierra la cascada con
 * `analysisStages.length`. Si esta lista se desalineara de los filtros
 * activos, la pantalla anunciaria un analisis que no ocurre —o al reves,
 * dejaria una fila girando para siempre porque nunca llega su cierre.
 */
describe('analysisStages', () => {
  it('tiene una etapa por cada filtro activo, en el mismo orden', () => {
    expect(analysisStages.map((stage) => stage.key)).toEqual(ENABLED_FILTERS);
  });

  it('nunca esta vacia: la pantalla de carga necesita algo que mostrar', () => {
    expect(analysisStages.length).toBeGreaterThan(0);
  });

  it('cada etapa trae su copy y un tiempo positivo', () => {
    for (const stage of analysisStages) {
      expect(stage.runningLabel.length).toBeGreaterThan(0);
      expect(stage.doneLabel.length).toBeGreaterThan(0);
      expect(stage.durationMs).toBeGreaterThan(0);
    }
  });
});
