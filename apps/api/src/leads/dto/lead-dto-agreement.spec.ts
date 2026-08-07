import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';
import { UpdateLeadDto } from './update-lead.dto';

/**
 * UpdateLeadDto repeats CreateLeadDto's format rules because it cannot be derived
 * with PartialType without reopening the explicit-null hole (see the comment in
 * update-lead.dto.ts). This test is what makes that duplication safe: the two
 * must agree about every shared rule, or one of them is wrong.
 *
 * Chosen over a compile-time bridge on purpose, and the contract says why (§3):
 * union drift is silent and semantic, so it earns machinery; a max-length
 * disagreement surfaces as a 400 that names the field. This converts the risk
 * into a failing test, which is proportionate.
 */

const VALID = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
};

const TOO_LONG_NAME = 'x'.repeat(101);

/** [field, value that must be rejected, what makes it invalid] */
const REJECTED: [string, unknown, string][] = [
  ['firstName', TOO_LONG_NAME, 'over 100 characters'],
  ['firstName', '   ', 'whitespace only, so empty after trimming'],
  ['lastName', TOO_LONG_NAME, 'over 100 characters'],
  ['email', 'not-an-email', 'not an email address'],
  ['email', `${'a'.repeat(250)}@example.com`, 'over 255 characters'],
  ['phone', 'x'.repeat(31), 'over 30 characters'],
  ['status', 'archived', 'outside LEAD_STATUSES'],
  ['budget', 100_000_001, 'over the 100,000,000 ceiling'],
  ['budget', -1, 'negative'],
  ['budget', 1.5, 'not an integer'],
  ['location', 'x'.repeat(101), 'over 100 characters'],
  ['propertyType', 'houseboat', 'outside PROPERTY_TYPES'],
  ['bedrooms', 21, 'over 20'],
  ['bedrooms', -1, 'negative'],
  ['source', 'x'.repeat(31), 'over 30 characters'],
  ['inquiryDate', '06/05/2026', 'not YYYY-MM-DD'],
  ['notes', 'x'.repeat(2001), 'over 2000 characters'],
];

describe('the create and update lead DTOs', () => {
  describe.each(REJECTED)('given %s that is %s: "%s"', (field, value) => {
    it('is rejected by CreateLeadDto', () => {
      expect(
        failingFields(CreateLeadDto, { ...VALID, [field]: value }),
      ).toContain(field);
    });

    it('is rejected by UpdateLeadDto', () => {
      expect(failingFields(UpdateLeadDto, { [field]: value })).toContain(field);
    });
  });

  describe('the two-case optional rule, applied by column nullability', () => {
    const NOT_NULL = [
      'firstName',
      'lastName',
      'email',
      'status',
      'inquiryDate',
    ];
    const NULLABLE = [
      'phone',
      'budget',
      'location',
      'propertyType',
      'bedrooms',
      'source',
      'notes',
    ];

    it.each(NOT_NULL)(
      'rejects an explicit null on %s, which backs a NOT NULL column',
      (field) => {
        expect(failingFields(UpdateLeadDto, { [field]: null })).toContain(
          field,
        );
      },
    );

    it.each(NULLABLE)(
      'accepts an explicit null on %s, so the field can be cleared',
      (field) => {
        expect(failingFields(UpdateLeadDto, { [field]: null })).toEqual([]);
      },
    );

    it('accepts an empty patch as a no-op', () => {
      expect(failingFields(UpdateLeadDto, {})).toEqual([]);
    });
  });
});

/**
 * The property names that failed validation. Goes through plainToInstance first
 * so the @Transform decorators run — otherwise the whitespace-only name case
 * would pass, since it is only empty after trimming.
 */
function failingFields(
  DtoClass: typeof CreateLeadDto | typeof UpdateLeadDto,
  payload: Record<string, unknown>,
): string[] {
  const instance = plainToInstance(DtoClass, payload);

  return validateSync(instance).map((error) => error.property);
}
