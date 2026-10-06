import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  NotificationType,
  notificationTypes,
} from '../../../domain/enums/notification-type.enum.js';

export class ListNotificationsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsIn(notificationTypes)
  type?: NotificationType;
}
