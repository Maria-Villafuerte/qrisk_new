import Storage from 'expo-sqlite/kv-store';
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  resetOnboarding,
} from '../onboardingStorage';

/**
 * El onboarding pide permisos de camara y ubicacion. Repetirlo en cada
 * arranque era el atajo del prototipo; lo que se prueba aqui es que la marca
 * sobrevive al reinicio y que un fallo de disco no saltea el flujo.
 */
const ONBOARDING_KEY = 'qrisk.onboarding.v1';

beforeEach(() => {
  // Restaurar ANTES de limpiar: si un test anterior dejo un mock puesto sobre
  // el Storage, `clearSync` se ejecutaria contra el mock y no limpiaria nada.
  jest.restoreAllMocks();
  Storage.clearSync();
});

describe('hasSeenOnboarding', () => {
  it('es falso la primera vez', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('es verdadero despues de marcarlo', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('ignora un valor que no sea la marca esperada', () => {
    // Un dato corrupto o de una version anterior no puede colar al usuario
    // dentro de la app sin haber pasado por los permisos.
    Storage.setItemSync(ONBOARDING_KEY, 'quiza');
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('devuelve falso si la lectura falla', () => {
    // Ante un disco roto se prefiere repetir el onboarding: es molesto, pero
    // saltearlo dejaria al usuario sin conceder los permisos.
    jest.spyOn(Storage, 'getItemSync').mockImplementation(() => {
      throw new Error('disco no disponible');
    });
    expect(hasSeenOnboarding()).toBe(false);
  });
});

describe('markOnboardingSeen', () => {
  it('guarda bajo la clave versionada esperada', () => {
    // Fija la clave exacta: un typo consistente entre lectura y escritura
    // pasaria desapercibido en todos los demas tests de este archivo.
    markOnboardingSeen();
    expect(Storage.getItemSync(ONBOARDING_KEY)).toBe('true');
  });

  it('no propaga el error si no se puede guardar', () => {
    jest.spyOn(Storage, 'setItemSync').mockImplementation(() => {
      throw new Error('sin espacio');
    });
    // Quedarse sin espacio no puede tumbar el final del onboarding.
    expect(() => markOnboardingSeen()).not.toThrow();
  });
});

describe('resetOnboarding', () => {
  it('vuelve a mostrar el onboarding', () => {
    markOnboardingSeen();
    resetOnboarding();
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('no propaga el error si no se puede borrar', () => {
    jest.spyOn(Storage, 'removeItemSync').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => resetOnboarding()).not.toThrow();
  });
});
