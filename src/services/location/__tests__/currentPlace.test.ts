import * as Location from 'expo-location';
import { getCurrentPlaceName } from '../currentPlace';

/**
 * El lugar es informacion secundaria: NUNCA puede romper un escaneo. Estas
 * pruebas cubren justamente los caminos de fallo.
 */
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;

const grantPermission = (granted: boolean) => {
  (mocked.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted });
};
const atPosition = () => {
  (mocked.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 14.6349, longitude: -90.5069 },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCurrentPlaceName', () => {
  it('devuelve el lugar compuesto cuando todo funciona', async () => {
    grantPermission(true);
    atPosition();
    (mocked.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: 'Café Aurora', district: 'Zona 4' },
    ]);

    await expect(getCurrentPlaceName()).resolves.toBe('Café Aurora, Zona 4');
  });

  it('devuelve null si se niega el permiso, sin pedir posicion', async () => {
    grantPermission(false);

    await expect(getCurrentPlaceName()).resolves.toBeNull();
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  /*
   * El permiso se pide en el onboarding, donde hay una pantalla que lo
   * explica. Si esto lo pidiera, el dialogo del sistema saldria encima de la
   * pantalla de carga durante el primer analisis: la persona lo responderia
   * dos veces, y la segunda sin contexto.
   */
  it('CONSULTA el permiso, nunca lo pide', async () => {
    grantPermission(true);
    atPosition();
    (mocked.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ city: 'Guatemala' }]);

    await getCurrentPlaceName();

    expect(mocked.getForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('tampoco lo pide cuando el permiso no esta concedido', async () => {
    grantPermission(false);

    await getCurrentPlaceName();

    expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('devuelve null si no se puede obtener la posicion', async () => {
    grantPermission(true);
    (mocked.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS apagado'));

    await expect(getCurrentPlaceName()).resolves.toBeNull();
  });

  it('devuelve null si la geocodificacion falla', async () => {
    grantPermission(true);
    atPosition();
    (mocked.reverseGeocodeAsync as jest.Mock).mockRejectedValue(new Error('sin servicio'));

    await expect(getCurrentPlaceName()).resolves.toBeNull();
  });

  it('devuelve null si la geocodificacion no devuelve direcciones', async () => {
    grantPermission(true);
    atPosition();
    (mocked.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

    await expect(getCurrentPlaceName()).resolves.toBeNull();
  });

  it('nunca lanza: un fallo de ubicacion no puede tumbar el escaneo', async () => {
    (mocked.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
      new Error('modulo no disponible'),
    );

    await expect(getCurrentPlaceName()).resolves.toBeNull();
  });
});
