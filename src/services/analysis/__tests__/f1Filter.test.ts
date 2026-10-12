import { f1Verdict } from '../f1Filter';

jest.mock('../safeBrowsing', () => ({
  checkSafeBrowsing: jest.fn(),
  isSafeBrowsingConfigured: jest.fn(),
  SAFE_BROWSING_TIMEOUT_MS: 4_000,
}));

const { checkSafeBrowsing, isSafeBrowsingConfigured } = require('../safeBrowsing') as {
  checkSafeBrowsing: jest.Mock;
  isSafeBrowsingConfigured: jest.Mock;
};

beforeEach(() => {
  checkSafeBrowsing.mockReset();
  isSafeBrowsingConfigured.mockReset();
  isSafeBrowsingConfigured.mockReturnValue(true);
  checkSafeBrowsing.mockResolvedValue('INCIERTO');
});

describe('f1Verdict · con Safe Browsing configurado', () => {
  it('un dominio de la lista local que Safe Browsing no conoce da SEGURO', async () => {
    const outcome = await f1Verdict('https://github.com/usuario/repo');

    expect(outcome.verdict).toBe('SEGURO');
    expect(outcome.source).toBe('lista_local');
  });

  it('una URL que Safe Browsing marca da MALICIOSO', async () => {
    checkSafeBrowsing.mockResolvedValue('MALICIOSO');

    const outcome = await f1Verdict('http://sitio-de-phishing.test/login');

    expect(outcome.verdict).toBe('MALICIOSO');
    expect(outcome.source).toBe('safe_browsing');
  });

  it('una URL que nadie conoce da INCIERTO y deja seguir la cascada', async () => {
    const outcome = await f1Verdict('https://sitio-cualquiera-8821.test/x');

    expect(outcome.verdict).toBe('INCIERTO');
    expect(outcome.source).toBe('ninguna');
  });

  /*
   * EL CASO QUE JUSTIFICA EL DISENO. Si la lista local cortara la cascada, un
   * atacante solo tendria que alojar su pagina bajo uno de los dominios
   * confiables para que la app la declarara segura sin consultar nada: la
   * whitelist seria una via de evasion.
   *
   * Safe Browsing opera sobre la URL COMPLETA, asi que puede conocer
   * `github.com/usuario/repo-malicioso` sin que eso diga nada de `github.com`.
   */
  describe('un dominio confiable comprometido', () => {
    it('Safe Browsing puede vetar un SEGURO de la lista local', async () => {
      checkSafeBrowsing.mockResolvedValue('MALICIOSO');

      const outcome = await f1Verdict('https://github.com/atacante/pagina-maliciosa');

      expect(outcome.verdict).toBe('MALICIOSO');
      expect(outcome.source).toBe('safe_browsing');
    });

    it('la lista local NO corta la consulta a Safe Browsing', async () => {
      await f1Verdict('https://github.com/usuario/repo');

      // Si esto dejara de llamarse, la whitelist se volveria evasion.
      expect(checkSafeBrowsing).toHaveBeenCalledWith('https://github.com/usuario/repo');
    });
  });

  it('MALICIOSO gana sobre SEGURO: la señal de peligro pesa mas', async () => {
    checkSafeBrowsing.mockResolvedValue('MALICIOSO');

    const outcome = await f1Verdict('https://google.com/algo');

    expect(outcome.verdict).toBe('MALICIOSO');
  });

  it('un dominio confiable sin HTTPS no da SEGURO ni con Safe Browsing callado', async () => {
    const outcome = await f1Verdict('http://github.com');

    expect(outcome.verdict).toBe('INCIERTO');
  });
});

describe('f1Verdict · sin clave configurada', () => {
  beforeEach(() => {
    isSafeBrowsingConfigured.mockReturnValue(false);
  });

  it('no llama a Safe Browsing', async () => {
    await f1Verdict('https://x.test/');
    expect(checkSafeBrowsing).not.toHaveBeenCalled();
  });

  it('la lista local sigue funcionando', async () => {
    const outcome = await f1Verdict('https://github.com');

    expect(outcome.verdict).toBe('SEGURO');
    expect(outcome.source).toBe('lista_local');
  });

  it('lo que no esta en la lista local queda INCIERTO', async () => {
    const outcome = await f1Verdict('https://sitio-cualquiera.test/');

    expect(outcome.verdict).toBe('INCIERTO');
    expect(outcome.source).toBe('ninguna');
  });

  it('la app no se rompe: F1 degrada sin credencial', async () => {
    await expect(f1Verdict('https://x.test/')).resolves.toMatchObject({
      verdict: 'INCIERTO',
    });
  });
});

describe('f1Verdict · medicion', () => {
  it('reporta cuanto tardo, para medir T_F1', async () => {
    const outcome = await f1Verdict('https://x.test/');

    expect(typeof outcome.elapsedMs).toBe('number');
    expect(outcome.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('un fallo de Safe Browsing no impide reportar el tiempo', async () => {
    checkSafeBrowsing.mockResolvedValue('INCIERTO');

    const outcome = await f1Verdict('https://x.test/');
    expect(outcome.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
