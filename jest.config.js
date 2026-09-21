/**
 * Pruebas unitarias con jest-expo.
 *
 * La cobertura se mide SOLO sobre la logica de negocio (`src/services`), que
 * es lo que pide la metrica del anteproyecto (>= 70%). Las pantallas y el
 * design system quedan fuera a proposito: se validan en las pruebas de
 * usabilidad y en dispositivo, no aqui.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    '!src/services/**/index.ts',
    '!src/services/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};
