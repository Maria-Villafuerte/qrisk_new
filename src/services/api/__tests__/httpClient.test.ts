import { ApiError } from '../errors';
import { postJson } from '../httpClient';

/**
 * El cliente siempre lanza ApiError: quien llama nunca ve un fallo de fetch
 * crudo ni un cuerpo a medio parsear.
 */
const mockFetch = (impl: (input: string, init: RequestInit) => Promise<Response>) => {
  (globalThis as { fetch: unknown }).fetch = jest.fn(impl as never);
};

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }) as Response;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('postJson', () => {
  it('devuelve el cuerpo parseado cuando todo va bien', async () => {
    mockFetch(async () => jsonResponse(200, { dominio: 'ejemplo.com' }));

    await expect(postJson('/analyze', { url: 'x' }, { timeoutMs: 1000 })).resolves.toEqual({
      dominio: 'ejemplo.com',
    });
  });

  it('manda JSON por POST', async () => {
    const spy = jest.fn(async () => jsonResponse(200, {}));
    mockFetch(spy as never);

    await postJson('/analyze', { url: 'https://x.com' }, { timeoutMs: 1000 });

    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ url: 'https://x.com' });
  });

  it('convierte un 500 en ApiError traducido', async () => {
    // La respuesta real del endpoint hoy.
    mockFetch(async () =>
      jsonResponse(500, {
        error: 'INTERNAL_ERROR',
        message: 'Error inesperado procesando la solicitud.',
      }),
    );

    await expect(postJson('/analyze', {}, { timeoutMs: 1000 })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INTERNAL',
      retryable: true,
    });
  });

  it('convierte un 400 de URL invalida', async () => {
    mockFetch(async () => jsonResponse(400, { error: 'URL_INVALIDA', message: 'no válida' }));

    await expect(postJson('/analyze', {}, { timeoutMs: 1000 })).rejects.toMatchObject({
      code: 'INVALID_URL',
      retryable: false,
    });
  });

  it('tolera un cuerpo que no es JSON', async () => {
    mockFetch(
      async () =>
        ({
          ok: false,
          status: 502,
          text: async () => '<html>Bad Gateway</html>',
        }) as Response,
    );

    const error = await postJson('/analyze', {}, { timeoutMs: 1000 }).catch((e: ApiError) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('INTERNAL');
  });

  it('tolera un cuerpo vacio en una respuesta correcta', async () => {
    mockFetch(async () => jsonResponse(200, undefined));
    await expect(postJson('/analyze', {}, { timeoutMs: 1000 })).resolves.toBeNull();
  });

  it('traduce un fallo de red a NETWORK', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });

    await expect(postJson('/analyze', {}, { timeoutMs: 1000 })).rejects.toMatchObject({
      code: 'NETWORK',
      retryable: true,
    });
  });

  it('corta por timeout y lo reporta como TIMEOUT', async () => {
    // Es el caso real: el endpoint se cuelga ~16s antes de fallar, muy por
    // encima del tope de 5s que pide la metrica T_F1.
    mockFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abort = new Error('Aborted');
            abort.name = 'AbortError';
            reject(abort);
          });
        }),
    );

    await expect(postJson('/analyze', {}, { timeoutMs: 20 })).rejects.toMatchObject({
      code: 'TIMEOUT',
      retryable: true,
    });
  });
});

/**
 * Cancelar no es lo mismo que agotar el tiempo. `AbortController` marca las dos
 * con el mismo `AbortError`, asi que sin distinguirlas al salir de la pantalla
 * se reportaba "El analisis tardo demasiado": un error que no ocurrio, y
 * encima marcado como reintentable.
 */
describe('postJson · cancelacion del llamador', () => {
  const nuncaResponde = () =>
    mockFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abort = new Error('Aborted');
            abort.name = 'AbortError';
            reject(abort);
          });
        }),
    );

  it('distingue cancelar de agotar el tiempo', async () => {
    nuncaResponde();
    const external = new AbortController();
    setTimeout(() => external.abort(), 10);

    await expect(
      postJson('/analyze', {}, { timeoutMs: 60_000, signal: external.signal }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('cancelar NO es reintentable: nadie espera ya la respuesta', async () => {
    nuncaResponde();
    const external = new AbortController();
    setTimeout(() => external.abort(), 10);

    const error = await postJson('/analyze', {}, { timeoutMs: 60_000, signal: external.signal })
      .catch((e: ApiError) => e);

    expect((error as ApiError).retryable).toBe(false);
  });

  it('con un signal que nunca se dispara, el timeout sigue siendo TIMEOUT', async () => {
    // No regresion: pasar `signal` no debe convertir todo en "cancelado".
    nuncaResponde();
    const external = new AbortController();

    await expect(
      postJson('/analyze', {}, { timeoutMs: 20, signal: external.signal }),
    ).rejects.toMatchObject({ code: 'TIMEOUT', retryable: true });
  });
});

describe('postJson · sin tope de tiempo', () => {
  it('sin `timeoutMs` no corta: espera lo que tarde el servidor', async () => {
    jest.useFakeTimers();
    try {
      let respond: (value: unknown) => void = () => {};
      (globalThis as { fetch?: unknown }).fetch = jest.fn(
        () =>
          new Promise((resolve) => {
            respond = resolve;
          }),
      );

      const pending = postJson('/analyze', {}, {});
      // Mucho mas que cualquier tope que haya tenido el analisis (40 s).
      jest.advanceTimersByTime(10 * 60_000);
      respond({ ok: true, status: 200, text: async () => '{"veredicto_final":"SEGURO"}' });

      await expect(pending).resolves.toEqual({ veredicto_final: 'SEGURO' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('sin tope, cancelar desde afuera sigue funcionando', async () => {
    (globalThis as { fetch?: unknown }).fetch = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const external = new AbortController();

    const pending = postJson('/analyze', {}, { signal: external.signal });
    external.abort();

    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
