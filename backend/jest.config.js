module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    testMatch: ['**/*.test.ts'],
    setupFilesAfterEnv: ['./tests/setup.ts'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetModules: true,
    restoreMocks: true,
};
