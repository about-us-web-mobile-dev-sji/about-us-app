import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UUID } from 'node:crypto';
import { MediaCategorie } from '../../../domain/enums/media-categorie.enum.js';

export class ImportFromUrlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nom!: string;

  @IsEnum(MediaCategorie)
  categorie!: MediaCategorie;

  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  sourceUrl!: string;

  @IsOptional()
  @IsUUID()
  espaceId?: UUID;
}
