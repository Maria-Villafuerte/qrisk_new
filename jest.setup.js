/**
 * El kv-store de expo-sqlite necesita el modulo nativo, que no existe en Node.
 * Se sustituye por un Map en memoria con la misma API sincrona: las pruebas
 * verifican la logica del historial (tope, orden, datos corruptos), no el
 * driver de SQLite.
 */
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItemSync: (key) => (store.has(key) ? store.get(key) : null),
      setItemSync: (key, value) => {
        store.set(key, value);
      },
      removeItemSync: (key) => store.delete(key),
      clearSync: () => {
        store.clear();
        return true;
      },
    },
  };
});
