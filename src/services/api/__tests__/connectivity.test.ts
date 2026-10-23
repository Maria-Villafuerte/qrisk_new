import { hasConnection } from '../connectivity';

/**
 * La comprobacion que hace el escaner antes de pasar al analisis. Lo unico que
 * importa es si la peticion llego: cualquier respuesta cuenta como conexion.
 */
const mockFetch = (impl: (input: string, init: RequestInit) => Promise<unknown>) => {
  (globalThis as { fetch: unknown }).fetch = jest.fn(impl as never);
};

afterEach(() => {
  jest.useRealTimers();
});

describe('hasConnection', () => {
  it('con respuesta del servidor hay conexion', async () => {
    mockFetch(async () => ({ ok: true, status: 200 }));
    await expect(hasConnection()).resolves.toBe(true);
  });

  it('un 403 o 404 tambien es conexion: la peticion llego', async () => {
    mockFetch(async () => ({ ok: false, status: 403 }));
    await expect(hasConnection()).resolves.toBe(true);
  });

  it('sin red no hay conexion', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(hasConnection()).resolves.toBe(false);
  });

  it('una red que no responde se corta y cuenta como sin conexion', async () => {
    jest.useFakeTimers();
    mockFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    const pending = hasConnection();
    jest.advanceTimersByTime(4_000);

    await expect(pending).resolves.toBe(false);
  });
});
