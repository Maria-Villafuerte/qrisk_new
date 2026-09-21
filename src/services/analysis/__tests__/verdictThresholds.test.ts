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
