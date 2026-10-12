import { checkPhishTank, lookupPhishTank, PHISHTANK_TIMEOUT_MS } from '../phishTank';

const KEY = 'EXPO_PUBLIC_PHISHTANK_KEY';
const original = process.env[KEY];

function setKey(value: string | undefined) {
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  setKey(undefined);
});

afterAll(() => {
  setKey(original);
});

/** Respuesta con la forma real de `checkurl`, medida el 2026-10-12. */
function reply(results: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => ({ meta: { status: 'success' }, results }),
  };
}

/** Phishing verificado y vigente (`allegrolokalnie.078259.top`, 2026-10-12). */
const confirmed = reply({
  url: 'http://allegrolokalnie.078259.top',
  in_database: true,
  phish_id: 9542835,
  verified: true,
  valid: true,
});

/** URL que PhishTank no conoce. */
const unknown = reply({ url: 'https://x.test/', in_database: false });

/** El campo `body` de la ultima llamada, decodificado. */
function sentBody(): URLSearchParams {
  return new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
}

describe('lookupPhishTank', () => {
  it('un phishing verificado y vigente esta reportado', async () => {
    fetchMock.mockResolvedValue(confirmed);
    await expect(lookupPhishTank('http://allegrolokalnie.078259.top')).resolves.toEqual({
      status: 'listed',
      phishId: 9542835,
    });
  });

  it('una URL que no esta en la base no esta reportada', async () => {
    fetchMock.mockResolvedValue(unknown);
    await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'not_listed' });
  });

  /*
   * EL CASO QUE JUSTIFICA MIRAR `valid`. Respuesta literal para
   * `https://github.com` el 2026-10-12: esta en la base, con un reporte que la
   * comunidad verifico y descarto. Contar `in_database` como amenaza haria
   * que GitHub saliera malicioso.
   */
  it('un reporte descartado por la comunidad NO cuenta como phishing', async () => {
    fetchMock.mockResolvedValue(
      reply({
        url: 'https://github.com',
        in_database: true,
        phish_id: 6842256,
        verified: true,
        valid: false,
      }),
    );
    await expect(lookupPhishTank('https://github.com')).resolves.toEqual({ status: 'not_listed' });
  });

  it('un reporte sin verificar todavia NO cuenta como phishing', async () => {
    fetchMock.mockResolvedValue(reply({ in_database: true, verified: false, valid: true }));
    await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'not_listed' });
  });

  it('acepta los booleanos en texto que la API ha usado', async () => {
    fetchMock.mockResolvedValue(reply({ in_database: 'true', verified: 'y', valid: 'yes' }));
    await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'listed' });
  });

  it('un valor raro en `valid` no condena', async () => {
    fetchMock.mockResolvedValue(reply({ in_database: true, verified: true, valid: 'quizas' }));
    await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'not_listed' });
  });

  describe('la peticion', () => {
    beforeEach(() => fetchMock.mockResolvedValue(unknown));

    it('va por POST como formulario, con el User-Agent que pide PhishTank', async () => {
      await lookupPhishTank('https://x.test/');

      const [endpoint, init] = fetchMock.mock.calls[0];
      expect(endpoint).toBe('https://checkurl.phishtank.com/checkurl/');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(init.headers['User-Agent']).toBe('phishtank/qrisk');
    });

    it('manda la URL recortada y pide JSON', async () => {
      await lookupPhishTank('  https://x.test/a?b=1&c=2  ');

      expect(sentBody().get('url')).toBe('https://x.test/a?b=1&c=2');
      expect(sentBody().get('format')).toBe('json');
    });

    it('sin clave no manda `app_key`: la consulta anonima funciona', async () => {
      await lookupPhishTank('https://x.test/');
      expect(sentBody().has('app_key')).toBe(false);
    });

    it('con clave la manda', async () => {
      setKey('clave-pt');
      await lookupPhishTank('https://x.test/');
      expect(sentBody().get('app_key')).toBe('clave-pt');
    });

    it('pasa una señal de aborto para poder cortar', async () => {
      await lookupPhishTank('https://x.test/');
      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('nunca lanza: cualquier fallo es "no se pudo consultar"', () => {
    it('un error HTTP (por ejemplo, el limite de consultas)', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
      await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'unavailable' });
    });

    it('un fallo de red', async () => {
      fetchMock.mockRejectedValue(new Error('sin red'));
      await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'unavailable' });
    });

    it('un JSON invalido', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('no es JSON');
        },
      });
      await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'unavailable' });
    });

    /*
     * Un 200 sin `results` no dice nada sobre la URL: decir "no reportada"
     * seria afirmar algo que nadie verifico.
     */
    it('una respuesta 200 sin `results`', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ meta: { status: 'error' }, errortext: 'rate limit' }),
      });
      await expect(lookupPhishTank('https://x.test/')).resolves.toEqual({ status: 'unavailable' });
    });

    it('una URL vacia no llama a la API', async () => {
      await expect(lookupPhishTank('   ')).resolves.toEqual({ status: 'unavailable' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('usa el mismo tope que Safe Browsing', () => {
    expect(PHISHTANK_TIMEOUT_MS).toBe(4_000);
  });

  it('aborta de verdad cuando se agota el tope', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );

      const pending = lookupPhishTank('https://x.test/');
      jest.advanceTimersByTime(PHISHTANK_TIMEOUT_MS);

      await expect(pending).resolves.toEqual({ status: 'unavailable' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('checkPhishTank', () => {
  it('devuelve MALICIOSO para un phishing confirmado', async () => {
    fetchMock.mockResolvedValue(confirmed);
    await expect(checkPhishTank('http://allegrolokalnie.078259.top')).resolves.toBe('MALICIOSO');
  });

  it('NUNCA devuelve SEGURO: no estar en la lista no prueba nada', async () => {
    fetchMock.mockResolvedValue(unknown);
    await expect(checkPhishTank('https://x.test/')).resolves.toBe('INCIERTO');
  });

  it('un fallo devuelve INCIERTO', async () => {
    fetchMock.mockRejectedValue(new Error('sin red'));
    await expect(checkPhishTank('https://x.test/')).resolves.toBe('INCIERTO');
  });
});
