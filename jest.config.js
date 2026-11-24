module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  // maplibre-gl 6 ships ESM only, with no "require" export for jest to resolve.
  moduleNameMapper: {
    '^maplibre-gl$': '<rootDir>/node_modules/maplibre-gl/dist/maplibre-gl.mjs'
  }
};
