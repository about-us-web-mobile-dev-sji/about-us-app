import { Type } from 'class-transformer';
import {
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { UUID } from 'node:crypto';

export class RequestPresignedUrlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsMimeType()
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size!: number;

  @IsOptional()
  @IsUUID()
  espaceId?: UUID;
}
