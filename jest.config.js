
module.exports = {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/client/**/*.test.ts?(x)'],
      preset: 'ts-jest',
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/*.test.ts'],
      preset: 'ts-jest',
    },
    {
      displayName: 'shared',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/shared/**/*.test.ts'],
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