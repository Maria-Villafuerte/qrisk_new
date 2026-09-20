import Storage from 'expo-sqlite/kv-store';
import { hasLocationEnabled, setLocationEnabledStored } from '../locationStorage';

/**
 * La ubicacion se persiste porque el onboarding ya no se repite. Sin esto, el
 * historial deja de anotar el lugar del escaneo tras el primer reinicio y la
 * metrica de geocodificacion queda sin poder demostrarse.
 */

// La misma clave que usa el modulo. Se repite a proposito: si alguien la
// cambia alli sin querer, el test de abajo lo detecta.
const LOCATION_KEY = 'qrisk.location.v1';

beforeEach(() => {
  // Restaurar ANTES de limpiar: si un test anterior dejo un mock puesto sobre
  // el Storage, `clearSync` se ejecutaria contra el mock y no limpiaria nada.
  jest.restoreAllMocks();
  Storage.clearSync();
});

describe('hasLocationEnabled', () => {
  it('es falso la primera vez', () => {
    expect(hasLocationEnabled()).toBe(false);
  });

  it('es verdadero despues de concederla', () => {
    setLocationEnabledStored(true);
    expect(hasLocationEnabled()).toBe(true);
  });

  it('vuelve a falso si el usuario la desactiva', () => {
    setLocationEnabledStored(true);
    setLocationEnabledStored(false);
    expect(hasLocationEnabled()).toBe(false);
  });

  it('ignora un valor que no sea la marca esperada', () => {
    Storage.setItemSync(LOCATION_KEY, 'si');
    expect(hasLocationEnabled()).toBe(false);
  });

  it('devuelve falso si la lectura falla', () => {
    jest.spyOn(Storage, 'getItemSync').mockImplementation(() => {
      throw new Error('disco lleno');
    });
    expect(hasLocationEnabled()).toBe(false);
  });
});

describe('setLocationEnabledStored', () => {
  it('guarda bajo la clave versionada esperada', () => {
    // Fija la clave exacta: un typo consistente entre lectura y escritura
    // pasaria desapercibido en todos los demas tests.
    setLocationEnabledStored(true);
    expect(Storage.getItemSync(LOCATION_KEY)).toBe('true');
  });

  it('no propaga el error si no se puede guardar', () => {
    jest.spyOn(Storage, 'setItemSync').mockImplementation(() => {
      throw new Error('disco lleno');
    });
    expect(() => setLocationEnabledStored(true)).not.toThrow();
  });
});
