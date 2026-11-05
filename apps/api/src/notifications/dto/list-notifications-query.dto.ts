import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_NOTIFICATION_LIMIT = 50;
export const MAX_NOTIFICATION_LIMIT = 100;

export class ListNotificationsQueryDto {
  /** Query strings arrive as text and implicit conversion is off globally, so convert here. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_NOTIFICATION_LIMIT)
  limit?: number;
}
