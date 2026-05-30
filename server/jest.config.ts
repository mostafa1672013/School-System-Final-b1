import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/index.ts'],
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'setup\\.ts$'],
  testTimeout: 10000,
  // Integration tests open real connections in CI (Prisma pool, ioredis) that
  // have no explicit teardown, so the event loop never drains and `jest` hangs
  // after all tests pass. Force exit once the run completes. Tests themselves
  // still all pass; this only governs process teardown.
  forceExit: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Sets required env vars (e.g. JWT_SECRET) before importing app modules.
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};

export default config;
