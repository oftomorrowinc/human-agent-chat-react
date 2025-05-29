module.exports = {
  testMatch: ['**/tests/examples-integration.test.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-examples.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  bail: 1,
  
  // Global setup for browser testing
  globalSetup: '<rootDir>/tests/jest-global-setup.js',
  globalTeardown: '<rootDir>/tests/jest-global-teardown.js',
  
  // Transform files if needed
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};