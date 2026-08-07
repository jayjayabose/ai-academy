import type {
  CreateInteractionRequest,
  InteractionType,
} from '@ai-academy/shared';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ValidateWhenPresent } from '../../common/validate-when-present';
import { NOTES_MAX } from '../../leads/dto/lead-constraints';
import { INTERACTION_TYPES } from '../interaction-type';

/**
 * The same two-case optional rule as the lead DTOs: `occurredAt` is NOT NULL with
 * a `now()` default, so it gets ValidateWhenPresent; `notes` is nullable, so it
 * gets @IsOptional().
 *
 * NOTES_MAX is imported from the lead constraints rather than redeclared — the
 * contract gives both notes columns the same ceiling, and two constants would
 * drift apart the first time one of them changed.
 */
export class CreateInteractionDto implements CreateInteractionRequest {
  @IsIn(INTERACTION_TYPES)
  declare type: InteractionType;

  // A genuine instant, unlike Lead.inquiryDate — so a full ISO 8601 datetime
  // rather than the YYYY-MM-DD pattern.
  @ValidateWhenPresent()
  @IsISO8601()
  declare occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX)
  declare notes?: string | null;
}
