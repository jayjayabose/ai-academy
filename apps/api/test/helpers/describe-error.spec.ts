import { describeError } from './describe-error';

/**
 * Guards Trap #14. The fallback exists because of a measured case, so the case
 * is reproduced here rather than described.
 */
describe('rendering a thrown value for a diagnostic message', () => {
  it('uses the message when there is one', () => {
    expect(
      describeError(new Error('connect ECONNREFUSED 127.0.0.1:5433')),
    ).toBe('connect ECONNREFUSED 127.0.0.1:5433');
  });

  it('falls back to the class name when the message is empty', () => {
    // Exactly what Sequelize throws with the container stopped: the class name
    // is the only signal it carries. Interpolating `error.message` alone
    // produces "Cause: " and tells you nothing.
    class SequelizeConnectionRefusedError extends Error {
      // Assigned, not inherited. `name` resolves to Error.prototype.name — the
      // literal string 'Error' — no matter what a subclass is called, so
      // `extends Error` alone does NOT reproduce the case. Sequelize sets it,
      // which is the only reason describeError's fallback works at all.
      name = 'SequelizeConnectionRefusedError';
    }

    expect(describeError(new SequelizeConnectionRefusedError(''))).toBe(
      'SequelizeConnectionRefusedError',
    );
  });

  it('stringifies a value that was thrown without being an Error', () => {
    expect(describeError('something went wrong')).toBe('something went wrong');
  });
});
