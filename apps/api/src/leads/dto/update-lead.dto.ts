import type {
  LeadStatus,
  PropertyType,
  UpdateLeadRequest,
} from '@ai-academy/shared';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ValidateWhenPresent } from '../../common/validate-when-present';
import { LEAD_STATUSES, PROPERTY_TYPES } from '../lead-status';
import {
  BEDROOMS_MAX,
  BUDGET_MAX,
  DATE_ONLY,
  EMAIL_MAX,
  LOCATION_MAX,
  NAME_MAX,
  NOTES_MAX,
  NormaliseEmail,
  PHONE_MAX,
  SOURCE_MAX,
  Trim,
} from './lead-constraints';

/**
 * Written out rather than derived with `PartialType(CreateLeadDto)`, which is
 * the obvious move and the wrong one.
 *
 * PartialType applies @IsOptional() to EVERY property
 * (@nestjs/mapped-types partial-type.helper.js:17), and @IsOptional() permits
 * null. That would make `PATCH {"status": null}` valid against a NOT NULL column
 * — the precise hole notes/day_01_contract.md:140-152 exists to close. Layering
 * ValidateWhenPresent back on top does not rescue it: class-validator ANDs every
 * conditional validation (ValidationExecutor.js:175), so @IsOptional() returning
 * false for null still wins and the property is skipped.
 *
 * So the rule is applied by column nullability, in both directions:
 *
 *   nullable    -> @IsOptional()          null clears the field
 *   NOT NULL    -> ValidateWhenPresent()  null is a 400
 *
 * Note that firstName, lastName and email move from *required* here to *optional
 * but still not nullable* — they are NOT NULL columns, so they get
 * ValidateWhenPresent, not @IsOptional. `PATCH {"email": null}` is a 400, and
 * `PATCH {}` is a no-op.
 *
 * The shared format rules are duplicated from CreateLeadDto. That duplication is
 * covered by a test asserting the two DTOs agree, rather than by machinery —
 * consistent with contract §3 on when drift justifies a compile-time bridge.
 */
export class UpdateLeadDto implements UpdateLeadRequest {
  @ValidateWhenPresent()
  @Trim()
  @IsString()
  @Length(1, NAME_MAX)
  declare firstName?: string;

  @ValidateWhenPresent()
  @Trim()
  @IsString()
  @Length(1, NAME_MAX)
  declare lastName?: string;

  @ValidateWhenPresent()
  @NormaliseEmail()
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  declare email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(PHONE_MAX)
  declare phone?: string | null;

  @ValidateWhenPresent()
  @IsIn(LEAD_STATUSES)
  declare status?: LeadStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(BUDGET_MAX)
  declare budget?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(LOCATION_MAX)
  declare location?: string | null;

  @IsOptional()
  @IsIn(PROPERTY_TYPES)
  declare propertyType?: PropertyType | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(BEDROOMS_MAX)
  declare bedrooms?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(SOURCE_MAX)
  declare source?: string | null;

  @ValidateWhenPresent()
  @Matches(DATE_ONLY, {
    message: 'inquiryDate must be a valid ISO 8601 date string (YYYY-MM-DD)',
  })
  declare inquiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  declare notes?: string | null;
}
