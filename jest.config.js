/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/server/**/*.test.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(jose)/)',
      ],
      transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
          ],
        }],
      },
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/client/**/*.test.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '\\.(?:css|scss)$': '<rootDir>/__mocks__/styleMock.js',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!(jose|flowbite-react-icons|framer-motion)/)',
      ],
      transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
      },
    },
  ],
};

module.exports = config;
