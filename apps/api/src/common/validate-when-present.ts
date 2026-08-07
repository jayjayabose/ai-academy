import { ValidateIf } from 'class-validator';

/**
 * For an optional property backed by a NOT NULL column.
 *
 * The optional-property rule has two cases, and using the wrong one opens a
 * hole (notes/day_01_contract.md:140-152):
 *
 *   nullable column  -> @IsOptional()          absent = unchanged, null = clear it
 *   NOT NULL column  -> ValidateWhenPresent()  absent = use the default, null = 400
 *
 * `@IsOptional()` skips every other validator when the value is null OR
 * undefined. `status` and `inquiryDate` are typed `?: T` with no `| null` and
 * back NOT NULL columns, so under @IsOptional() a literal
 * `PATCH {"status": null}` validates clean, reaches Postgres and comes back as a
 * 500 or a raw 23502. TypeScript stops the Angular client; nothing stops curl.
 *
 * This skips validation only for `undefined`, so an explicit null falls through
 * to @IsIn / @IsString and earns a proper 400.
 *
 * NOTE: this is also why UpdateLeadDto is written out rather than derived with
 * PartialType. PartialType applies @IsOptional() to every property
 * (@nestjs/mapped-types partial-type.helper.js:17), which would reintroduce
 * exactly this hole — and re-applying ValidateWhenPresent on top does NOT undo
 * it, because class-validator ANDs all conditional validations
 * (ValidationExecutor.js:175). @IsOptional() returning false for null wins.
 */
export function ValidateWhenPresent(): PropertyDecorator {
  return ValidateIf((_object: unknown, value: unknown) => value !== undefined);
}
