module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/database/seed.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  restoreMocks: true
};
