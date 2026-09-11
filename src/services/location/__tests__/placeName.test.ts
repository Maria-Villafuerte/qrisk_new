import { composePlaceName } from '../placeName';

/**
 * La metrica pide ">= 85% produce un nombre de lugar legible". Se prueba la
 * composicion en frio, sin GPS ni permisos.
 */
describe('composePlaceName', () => {
  it('junta el sitio con la zona', () => {
    expect(
      composePlaceName({ name: 'Café Aurora', district: 'Zona 4', city: 'Ciudad de Guatemala' }),
    ).toBe('Café Aurora, Zona 4');
  });

  it('usa la calle con su numero cuando no hay nombre de sitio', () => {
    expect(composePlaceName({ street: '6a avenida', streetNumber: '12', city: 'Antigua' })).toBe(
      '6a avenida 12, Antigua',
    );
  });

  it('usa la calle sola si no hay numero', () => {
    expect(composePlaceName({ street: '6a avenida', district: 'Zona 1' })).toBe(
      '6a avenida, Zona 1',
    );
  });

  it('cae a la ciudad cuando no hay nada mas especifico', () => {
    expect(composePlaceName({ city: 'Quetzaltenango' })).toBe('Quetzaltenango');
  });

  it('recorre la jerarquia hasta encontrar algo utilizable', () => {
    expect(composePlaceName({ subregion: 'Sacatepéquez' })).toBe('Sacatepéquez');
    expect(composePlaceName({ region: 'Guatemala' })).toBe('Guatemala');
    expect(composePlaceName({ country: 'Guatemala' })).toBe('Guatemala');
  });

  it('no repite el mismo valor dos veces', () => {
    // Pasa de verdad: el geocodificador puede devolver name y district iguales.
    expect(composePlaceName({ name: 'Zona 10', district: 'Zona 10' })).toBe('Zona 10');
  });

  it('ignora vacios y espacios en blanco', () => {
    expect(composePlaceName({ name: '   ', district: 'Zona 4' })).toBe('Zona 4');
    expect(composePlaceName({ name: '', street: null, city: 'Mixco' })).toBe('Mixco');
  });

  it('nunca junta mas de dos partes', () => {
    const place = composePlaceName({
      name: 'Centro Comercial Miraflores',
      district: 'Zona 11',
      city: 'Ciudad de Guatemala',
      country: 'Guatemala',
    });
    expect(place).toBe('Centro Comercial Miraflores, Zona 11');
    expect(place?.split(',')).toHaveLength(2);
  });

  it('devuelve null cuando no hay nada legible', () => {
    // La UI oculta la fila del lugar; es mejor que mostrar "null".
    expect(composePlaceName({})).toBeNull();
    expect(composePlaceName(null)).toBeNull();
    expect(composePlaceName(undefined)).toBeNull();
    expect(composePlaceName({ city: null, region: null, country: null })).toBeNull();
  });
});
