/**
 * Barrel for the `@test/helpers` alias used by integration specs
 * (chapter 02:623). The alias is declared twice on purpose — tsconfig.json
 * `paths` for the type checker, jest.config.ts `moduleNameMapper` for the
 * module loader. Trap #8: the Jest half must be PER PROJECT.
 */
export * from './test-database';
