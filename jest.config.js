// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/client/**/*.test.ts?(x)'],
      preset: 'ts-jest',
      setupFilesAfterEnv: ['@testing-library/jest-dom'], // <- fixed key
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/*.test.ts'],
      preset: 'ts-jest',
    },
  ],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      statements: 70,
      functions: 70,
      lines: 70,
      branches: 50,
    },
  },
};