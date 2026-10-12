import {
  checkSafeBrowsing,
  isSafeBrowsingConfigured,
  lookupSafeBrowsing,
  SAFE_BROWSING_TIMEOUT_MS,
} from '../safeBrowsing';

const KEY = 'EXPO_PUBLIC_SAFE_BROWSING_KEY';
const original = process.env[KEY];

function setKey(value: string | undefined) {
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
}

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  setKey('clave-de-prueba');
});

afterAll(() => {
  setKey(original);
});

/** Respuesta de la API cuando SI hay coincidencia. */
const match = {
  ok: true,
  json: async () => ({
    matches: [{ threatType: 'SOCIAL_ENGINEERING', threat: { url: 'http://malo.test/' } }],
  }),
};

/** Respuesta cuando no hay coincidencia: la API devuelve `{}`. */
const noMatch = { ok: true, json: async () => ({}) };

describe('isSafeBrowsingConfigured', () => {
  it('es falso sin clave', () => {
    setKey(undefined);
    expect(isSafeBrowsingConfigured()).toBe(false);
  });

  it('es falso con una clave en blanco', () => {
    setKey('   ');
    expect(isSafeBrowsingConfigured()).toBe(false);
  });

  it('es verdadero con una clave', () => {
    setKey('abc123');
    expect(isSafeBrowsingConfigured()).toBe(true);
  });
});

describe('checkSafeBrowsing', () => {
  it('devuelve MALICIOSO cuando la URL coincide con una lista', async () => {
    fetchMock.mockResolvedValue(match);
    await expect(checkSafeBrowsing('http://malo.test/')).resolves.toBe('MALICIOSO');
  });

  /*
   * EL CASO MAS IMPORTANTE DE ESTE ARCHIVO. Que Safe Browsing no conozca una
   * URL no la hace segura: la mayoria de los sitios de phishing son nuevos y no
   * han sido reportados. Si esto devolviera SEGURO, la app produciria falsos
   * "seguro", que es el peor resultado posible del producto.
   */
  it('NO devuelve SEGURO cuando no hay coincidencia: devuelve INCIERTO', async () => {
    fetchMock.mockResolvedValue(noMatch);
    await expect(checkSafeBrowsing('https://sitio-nuevo.test/')).resolves.toBe('INCIERTO');
  });

  it('pregunta por malware y por ingenieria social', async () => {
    fetchMock.mockResolvedValue(noMatch);
    await checkSafeBrowsing('https://x.test/');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.threatInfo.threatTypes).toEqual(['MALWARE', 'SOCIAL_ENGINEERING']);
    expect(body.threatInfo.threatEntries).toEqual([{ url: 'https://x.test/' }]);
  });

  it('manda la clave en la query', async () => {
    setKey('mi-clave');
    fetchMock.mockResolvedValue(noMatch);
    await checkSafeBrowsing('https://x.test/');

    expect(fetchMock.mock.calls[0][0]).toContain('key=mi-clave');
  });

  it('recorta la URL antes de consultar', async () => {
    fetchMock.mockResolvedValue(noMatch);
    await checkSafeBrowsing('  https://x.test/  ');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.threatInfo.threatEntries[0].url).toBe('https://x.test/');
  });

  describe('no rompe el analisis cuando algo falla', () => {
    it('sin clave no llama a la API y devuelve INCIERTO', async () => {
      setKey(undefined);
      await expect(checkSafeBrowsing('https://x.test/')).resolves.toBe('INCIERTO');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('una URL vacia no llama a la API', async () => {
      await expect(checkSafeBrowsing('   ')).resolves.toBe('INCIERTO');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('un error HTTP devuelve INCIERTO', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
      await expect(checkSafeBrowsing('https://x.test/')).resolves.toBe('INCIERTO');
    });

    it('un fallo de red devuelve INCIERTO', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));
      await expect(checkSafeBrowsing('https://x.test/')).resolves.toBe('INCIERTO');
    });

    it('un JSON invalido devuelve INCIERTO', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('no es JSON');
        },
      });
      await expect(checkSafeBrowsing('https://x.test/')).resolves.toBe('INCIERTO');
    });

    it('un `matches` que no es arreglo devuelve INCIERTO', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ matches: 'raro' }) });
      await expect(checkSafeBrowsing('https://x.test/')).resolves.toBe('INCIERTO');
    });

    it('un `matches` vacio devuelve INCIERTO', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ matches: [] }) });
      await expect(checkSafeBrowsing('https://x.test/')).resolves.toBe('INCIERTO');
    });
  });

  it('corta la consulta con un tope por debajo del presupuesto de F1', () => {
    // El protocolo fija T_F1 <= 5 s y su plan de riesgos (R2) habla de 4 s por
    // API. Si este tope subiera por encima de 5 s, F1 dejaria de cumplir su
    // propio objetivo.
    expect(SAFE_BROWSING_TIMEOUT_MS).toBeLessThanOrEqual(4_000);
  });

  it('pasa una señal de aborto para poder cortar', async () => {
    fetchMock.mockResolvedValue(noMatch);
    await checkSafeBrowsing('https://x.test/');

    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
  });

  it('aborta de verdad cuando se agota el tope', async () => {
    jest.useFakeTimers();
    // `fetch` que respeta la señal, como lo hace el real.
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );

    const promise = checkSafeBrowsing('https://lenta.test/');
    jest.advanceTimersByTime(SAFE_BROWSING_TIMEOUT_MS + 1);

    await expect(promise).resolves.toBe('INCIERTO');
    jest.useRealTimers();
  });
});

/*
 * `lookupSafeBrowsing` conserva lo que `checkSafeBrowsing` colapsa en
 * INCIERTO, para que la pantalla no diga "no la tiene reportada" cuando la
 * consulta ni siquiera se pudo hacer.
 */
describe('lookupSafeBrowsing', () => {
  it('devuelve el tipo de amenaza de la coincidencia', async () => {
    fetchMock.mockResolvedValue(match);
    await expect(lookupSafeBrowsing('http://malo.test/')).resolves.toEqual({
      status: 'listed',
      threatType: 'SOCIAL_ENGINEERING',
    });
  });

  it('una coincidencia sin tipo sigue siendo una coincidencia', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ matches: [{}] }) });
    await expect(lookupSafeBrowsing('http://malo.test/')).resolves.toEqual({ status: 'listed' });
  });

  it('distingue "no reportada" de "no se pudo consultar"', async () => {
    fetchMock.mockResolvedValue(noMatch);
    await expect(lookupSafeBrowsing('https://x.test/')).resolves.toEqual({ status: 'not_listed' });

    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    await expect(lookupSafeBrowsing('https://x.test/')).resolves.toEqual({ status: 'unavailable' });

    fetchMock.mockRejectedValue(new Error('sin red'));
    await expect(lookupSafeBrowsing('https://x.test/')).resolves.toEqual({ status: 'unavailable' });
  });

  it('sin clave dice que no esta configurado, sin llamar a la API', async () => {
    setKey(undefined);
    await expect(lookupSafeBrowsing('https://x.test/')).resolves.toEqual({
      status: 'not_configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
