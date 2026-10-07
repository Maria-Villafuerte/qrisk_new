import { VERDICT_THRESHOLDS, verdictFromScore } from '../verdictThresholds';

/**
 * Los cortes deciden que ve el usuario, asi que se fijan aqui: cambiarlos sin
 * querer es cambiar el producto. Los bordes exactos se prueban uno por uno
 * porque un `>` donde va un `>=` mueve la frontera un punto y eso no se nota
 * mirando el codigo.
 */
describe('verdictFromScore', () => {
  it('sin señales es seguro', () => {
    expect(verdictFromScore(0)).toBe('seguro');
  });

  it('una sola señal menor no basta para alarmar', () => {
    // 15 = solo "sin HTTPS". Marcar de riesgo todo sitio sin HTTPS daria
    // demasiados falsos positivos.
    expect(verdictFromScore(15)).toBe('seguro');
  });

  it('el ultimo punto antes del corte sigue siendo seguro', () => {
    expect(verdictFromScore(VERDICT_THRESHOLDS.suspicious - 1)).toBe('seguro');
  });

  it('en el corte exacto ya es sospechoso', () => {
    expect(verdictFromScore(VERDICT_THRESHOLDS.suspicious)).toBe('sospechoso');
  });

  it('el ultimo punto antes del segundo corte sigue siendo sospechoso', () => {
    expect(verdictFromScore(VERDICT_THRESHOLDS.malicious - 1)).toBe('sospechoso');
  });

  it('en el segundo corte exacto ya es malicioso', () => {
    expect(verdictFromScore(VERDICT_THRESHOLDS.malicious)).toBe('malicioso');
  });

  it('el maximo es malicioso', () => {
    expect(verdictFromScore(100)).toBe('malicioso');
  });
});

describe('verdictFromScore · casos reales del backend', () => {
  // Puntajes observados el 2026-09-20 contra el endpoint desplegado.
  it.each([
    ['github.com', 0, 'seguro'],
    ['menu.cafeaurora.com/es', 0, 'seguro'],
    ['banco-lndustrial-seguro.top/acceso', 40, 'sospechoso'],
    ['192.168.1.1/login.php', 60, 'malicioso'],
  ] as const)('%s (puntaje %i) es %s', (_url, score, esperado) => {
    expect(verdictFromScore(score)).toBe(esperado);
  });
});

/**
 * Un puntaje fuera de 0-100 significa que el backend cambio de escala, no que
 * el sitio sea "muy seguro" o "muy malicioso". Interpretarlo con la tabla
 * vieja es como se produce un veredicto equivocado con aspecto de correcto.
 */
describe('verdictFromScore · puntaje fuera de la escala 0-100', () => {
  it('un puntaje negativo NO es seguro: es incierto', () => {
    // Lo peligroso de verdad: con la tabla vieja, -20 daba "seguro".
    expect(verdictFromScore(-20)).toBeNull();
    expect(verdictFromScore(-1)).toBeNull();
  });

  it('un puntaje mayor que 100 tampoco se interpreta', () => {
    expect(verdictFromScore(150)).toBeNull();
    expect(verdictFromScore(101)).toBeNull();
  });

  it('los extremos validos siguen funcionando', () => {
    // 0 y 100 son escala valida: el corte es estrictamente fuera de ella.
    expect(verdictFromScore(0)).toBe('seguro');
    expect(verdictFromScore(100)).toBe('malicioso');
  });

  it('nunca devuelve seguro ante una escala que no entendemos', () => {
    for (const score of [-100, -1, 101, 1000]) {
      expect(verdictFromScore(score)).not.toBe('seguro');
    }
  });
});

describe('verdictFromScore · sin puntaje', () => {
  it('devuelve null si el backend no mando puntaje', () => {
    // No se presume "seguro": quien llama lo deja en "incierto".
    expect(verdictFromScore(undefined)).toBeNull();
  });

  it('devuelve null ante un valor que no es un numero usable', () => {
    expect(verdictFromScore(NaN)).toBeNull();
    expect(verdictFromScore(Infinity)).toBeNull();
  });

  it('nunca devuelve seguro cuando no hay informacion', () => {
    expect(verdictFromScore(undefined)).not.toBe('seguro');
  });
});
