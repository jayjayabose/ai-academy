import type { Config } from 'jest';

/**
 * Decision 9: two Jest projects, `unit` is the default.
 *
 * The decisive property is that `npm test` runs the unit project ALONE and
 * passes with Docker stopped. The fast gate must never depend on
 * infrastructure — the moment it does, people stop running it.
 *
 * Trap #8: `transform` and `moduleNameMapper` are declared PER PROJECT. Jest
 * does not inherit them from the top level of a `projects` config; put them
 * there and the `@test/helpers` alias silently fails to resolve, which surfaces
 * as "Cannot find module" from a file that plainly exists.
 */

// No `rootDir` here on purpose. Jest 30 loads a TypeScript config as an ES
// module, so `__dirname` is not defined; the default — the directory holding
// this file — is what we want anyway, and inline project objects inherit it.
const projectDefaults = {
    testEnvironment: 'node',
    moduleFileExtensions: ['js', 'json', 'ts'],

    transform: {
        // tsconfig.spec.json extends tsconfig.json and changes only what a
        // CommonJS test sandbox requires. Tests therefore type-check under the
        // same rules as the code they exercise.
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },

    // The runtime half of the `@test/*` alias. tsconfig.json:paths is the
    // compile-time half — see the comment there.
    moduleNameMapper: {
        '^@test/(.*)$': '<rootDir>/test/$1',
    },
} satisfies Partial<Config>;

const config: Config = {
    projects: [
        {
            ...projectDefaults,
            displayName: 'unit',
            // Everything except *.integration.spec.ts. The ignore pattern is what
            // keeps Docker off the critical path; testMatch alone would also match
            // the integration specs, since they end in .spec.ts too.
            testMatch: ['<rootDir>/src/**/*.spec.ts'],
            testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$'],
        },
        {
            ...projectDefaults,
            displayName: 'integration',
            testMatch: [
                '<rootDir>/src/**/*.integration.spec.ts',
                '<rootDir>/test/**/*.integration.spec.ts',
            ],
            // D8: crm_test's schema is built by the migrations, not by
            // `synchronize: true`. A synchronize-built schema never exercises the
            // migrations, so a broken migration would pass the whole suite and
            // fail only on a fresh clone.
            globalSetup: '<rootDir>/test/global-setup.ts',
        },
    ],

    collectCoverageFrom: ['src/**/*.(t|j)s'],
    coverageDirectory: '<rootDir>/coverage',
};

export default config;
