import { f1Verdict } from '../f1Filter';

jest.mock('../safeBrowsing', () => ({
  lookupSafeBrowsing: jest.fn(),
  isSafeBrowsingConfigured: jest.fn(),
  SAFE_BROWSING_TIMEOUT_MS: 4_000,
}));

jest.mock('../phishTank', () => ({
  lookupPhishTank: jest.fn(),
  PHISHTANK_TIMEOUT_MS: 4_000,
}));

const { lookupPhishTank } = require('../phishTank') as { lookupPhishTank: jest.Mock };

const { lookupSafeBrowsing, isSafeBrowsingConfigured } = require('../safeBrowsing') as {
  lookupSafeBrowsing: jest.Mock;
  isSafeBrowsingConfigured: jest.Mock;
};

beforeEach(() => {
  lookupSafeBrowsing.mockReset();
  isSafeBrowsingConfigured.mockReset();
  isSafeBrowsingConfigured.mockReturnValue(true);
  lookupSafeBrowsing.mockResolvedValue({ status: 'not_listed' });
  lookupPhishTank.mockReset();
  lookupPhishTank.mockResolvedValue({ status: 'not_listed' });
});

describe('f1Verdict · con Safe Browsing configurado', () => {
  it('un dominio de la lista local que Safe Browsing no conoce da SEGURO', async () => {
    const outcome = await f1Verdict('https://github.com/usuario/repo');

    expect(outcome.verdict).toBe('SEGURO');
    expect(outcome.source).toBe('lista_local');
  });

  it('una URL que Safe Browsing marca da MALICIOSO', async () => {
    lookupSafeBrowsing.mockResolvedValue({ status: 'listed' });

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
      lookupSafeBrowsing.mockResolvedValue({ status: 'listed' });

      const outcome = await f1Verdict('https://github.com/atacante/pagina-maliciosa');

      expect(outcome.verdict).toBe('MALICIOSO');
      expect(outcome.source).toBe('safe_browsing');
    });

    it('la lista local NO corta la consulta a Safe Browsing', async () => {
      await f1Verdict('https://github.com/usuario/repo');

      // Si esto dejara de llamarse, la whitelist se volveria evasion.
      expect(lookupSafeBrowsing).toHaveBeenCalledWith('https://github.com/usuario/repo');
    });
  });

  it('MALICIOSO gana sobre SEGURO: la señal de peligro pesa mas', async () => {
    lookupSafeBrowsing.mockResolvedValue({ status: 'listed' });

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
    expect(lookupSafeBrowsing).not.toHaveBeenCalled();
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
    lookupSafeBrowsing.mockResolvedValue({ status: 'unavailable' });

    const outcome = await f1Verdict('https://x.test/');
    expect(outcome.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});

/*
 * El detalle de la consulta viaja en el resultado para que la pantalla pueda
 * explicar F1 sin afirmar lo que no se verifico: el veredicto INCIERTO no
 * distingue "no la tiene reportada" de "no se pudo consultar".
 */
describe('f1Verdict · detalle para la pantalla', () => {
  it('conserva el tipo de amenaza que reporto Safe Browsing', async () => {
    lookupSafeBrowsing.mockResolvedValue({ status: 'listed', threatType: 'MALWARE' });

    const outcome = await f1Verdict('http://malo.test/x.exe');

    expect(outcome.safeBrowsing).toEqual({ status: 'listed', threatType: 'MALWARE' });
  });

  it('distingue una consulta fallida de una URL no reportada', async () => {
    lookupSafeBrowsing.mockResolvedValue({ status: 'unavailable' });

    const outcome = await f1Verdict('https://x.test/');

    expect(outcome.verdict).toBe('INCIERTO');
    expect(outcome.safeBrowsing.status).toBe('unavailable');
  });

  it('marca si el dominio esta en la lista de confianza', async () => {
    expect((await f1Verdict('https://github.com/x')).localTrusted).toBe(true);
    expect((await f1Verdict('https://x.test/')).localTrusted).toBe(false);
  });

  it('un dominio confiable que Safe Browsing reporta sigue marcado como confiable', async () => {
    // La pantalla tiene que poder mostrar las dos cosas: es de un dominio
    // confiable Y esta URL concreta esta reportada.
    lookupSafeBrowsing.mockResolvedValue({ status: 'listed' });

    const outcome = await f1Verdict('https://github.com/atacante/x');

    expect(outcome.verdict).toBe('MALICIOSO');
    expect(outcome.localTrusted).toBe(true);
  });

  it('sin clave informa que Safe Browsing no esta configurado', async () => {
    isSafeBrowsingConfigured.mockReturnValue(false);

    const outcome = await f1Verdict('https://x.test/');

    expect(outcome.safeBrowsing).toEqual({ status: 'not_configured' });
  });
});

describe('f1Verdict · PhishTank', () => {
  it('una URL que PhishTank confirma da MALICIOSO, con PhishTank como fuente', async () => {
    lookupPhishTank.mockResolvedValue({ status: 'listed', phishId: 9542835 });

    const outcome = await f1Verdict('http://allegrolokalnie.078259.top');

    expect(outcome.verdict).toBe('MALICIOSO');
    expect(outcome.source).toBe('phishtank');
    expect(outcome.phishTank).toEqual({ status: 'listed', phishId: 9542835 });
  });

  it('PhishTank tambien puede vetar un SEGURO de la lista local', async () => {
    lookupPhishTank.mockResolvedValue({ status: 'listed' });

    const outcome = await f1Verdict('https://github.com/atacante/pagina');

    expect(outcome.verdict).toBe('MALICIOSO');
    expect(outcome.source).toBe('phishtank');
  });

  it('si las dos la reportan, la fuente es Safe Browsing y se conservan las dos', async () => {
    lookupSafeBrowsing.mockResolvedValue({ status: 'listed', threatType: 'SOCIAL_ENGINEERING' });
    lookupPhishTank.mockResolvedValue({ status: 'listed' });

    const outcome = await f1Verdict('http://malo.test/');

    expect(outcome.source).toBe('safe_browsing');
    expect(outcome.safeBrowsing.status).toBe('listed');
    expect(outcome.phishTank.status).toBe('listed');
  });

  it('un fallo de PhishTank no impide concluir SEGURO por la lista local', async () => {
    lookupPhishTank.mockResolvedValue({ status: 'unavailable' });

    const outcome = await f1Verdict('https://github.com/usuario/repo');

    expect(outcome.verdict).toBe('SEGURO');
    expect(outcome.phishTank.status).toBe('unavailable');
  });

  it('sin clave de Safe Browsing, PhishTank se consulta igual', async () => {
    isSafeBrowsingConfigured.mockReturnValue(false);
    lookupPhishTank.mockResolvedValue({ status: 'listed' });

    const outcome = await f1Verdict('http://malo.test/');

    expect(lookupSafeBrowsing).not.toHaveBeenCalled();
    expect(outcome.verdict).toBe('MALICIOSO');
    expect(outcome.source).toBe('phishtank');
  });

  /*
   * EN PARALELO, NO EN SERIE. Con cada consulta topada en 4 s, en serie T_F1
   * podria llegar a 8 s y salirse del presupuesto del protocolo (5 s).
   */
  it('lanza las dos consultas antes de que termine ninguna', async () => {
    let releaseSafeBrowsing: (value: unknown) => void = () => {};
    lookupSafeBrowsing.mockReturnValue(
      new Promise((resolve) => {
        releaseSafeBrowsing = resolve;
      }),
    );

    const pending = f1Verdict('https://x.test/');
    // Safe Browsing sigue sin responder y PhishTank ya fue consultado.
    expect(lookupSafeBrowsing).toHaveBeenCalledTimes(1);
    expect(lookupPhishTank).toHaveBeenCalledTimes(1);

    releaseSafeBrowsing({ status: 'not_listed' });
    await expect(pending).resolves.toMatchObject({ verdict: 'INCIERTO' });
  });

  it('el tiempo de F1 es el de la mas lenta, no la suma', async () => {
    jest.useFakeTimers();
    try {
      const after = (ms: number, value: unknown) =>
        new Promise((resolve) => setTimeout(() => resolve(value), ms));
      lookupSafeBrowsing.mockReturnValue(after(3_000, { status: 'not_listed' }));
      lookupPhishTank.mockReturnValue(after(3_000, { status: 'not_listed' }));

      let done = false;
      const pending = f1Verdict('https://x.test/').then((outcome) => {
        done = true;
        return outcome;
      });

      // A los 3 s ya termino: en serie harian falta 6.
      await jest.advanceTimersByTimeAsync(3_000);
      expect(done).toBe(true);
      await pending;
    } finally {
      jest.useRealTimers();
    }
  });
});
