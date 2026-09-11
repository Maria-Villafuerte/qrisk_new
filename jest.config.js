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
    '!src/services/mock/**',
    '!src/services/**/index.ts',
    '!src/services/**/types.ts',
    // El servicio de analisis es todavia el mock con setTimeout: se reemplaza
    // por el cliente real en la Fase 3 y ahi entra a la cobertura con sus
    // pruebas de adaptador y de errores.
    '!src/services/analysis/analysisService.ts',
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
