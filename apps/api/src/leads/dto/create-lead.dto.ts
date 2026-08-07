import type {
  CreateLeadRequest,
  LeadStatus,
  PropertyType,
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
 * `implements CreateLeadRequest` is the compile-time bridge to the wire
 * contract: rename or retype a field in packages/shared and this file stops
 * compiling. That is the payoff Decision 6 was chosen for.
 *
 * Required set is identity plus one reliable contact key. Everything else is
 * routinely unknown when a salesperson records a lead mid-phone-call, and a CRM
 * that refuses the record because the property type is unknown is broken.
 */
export class CreateLeadDto implements CreateLeadRequest {
  // Length, not MaxLength: after Trim() a whitespace-only value is '', and the
  // column is NOT NULL but perfectly happy to store an empty string.
  @Trim()
  @IsString()
  @Length(1, NAME_MAX)
  declare firstName: string;

  @Trim()
  @IsString()
  @Length(1, NAME_MAX)
  declare lastName: string;

  @NormaliseEmail()
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  declare email: string;

  // No format regex, deliberately: international phone formats vary enough that
  // a regex mostly rejects valid numbers.
  @IsOptional()
  @IsString()
  @MaxLength(PHONE_MAX)
  declare phone?: string | null;

  // NOT NULL with a database default -> ValidateWhenPresent, never @IsOptional.
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

  // No `land` cross-check. The convention that land has no bedrooms is
  // data quality, not an invariant, and enforcing it here without the matching
  // CHECK would make the API stricter than the schema (contract §3).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(BEDROOMS_MAX)
  declare bedrooms?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(SOURCE_MAX)
  declare source?: string | null;

  /**
   * NOT NULL with a `DEFAULT CURRENT_DATE` backstop -> ValidateWhenPresent.
   * The client sends its own local today, because CURRENT_DATE is the database's
   * today and the container runs UTC: a user at UTC-8 creating a lead at 17:00
   * local is already tomorrow in UTC.
   */
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
