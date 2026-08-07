/**
 * Renders an unknown thrown value as something worth printing.
 *
 * Exists because of a measured case: with the container stopped, Sequelize
 * throws `SequelizeConnectionRefusedError` with an EMPTY `message` — and an
 * empty `original.message` too. A naive `error.message` interpolation therefore
 * produces "Cause: " and tells you nothing. The class name is the only signal
 * it carries, so fall back to it.
 */
export function describeError(error: unknown): string {
    if (!(error instanceof Error)) return String(error);

    return error.message || error.name;
}
