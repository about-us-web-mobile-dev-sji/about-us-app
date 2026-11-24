import {
  IsMimeType,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UUID } from 'node:crypto';

export class RegisterInternalResourceDto {
  @IsUUID()
  resource_id!: UUID;

  @IsUUID()
  espace_id!: UUID;

  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  version!: string;

  @IsMimeType()
  mime_type!: string;
}
