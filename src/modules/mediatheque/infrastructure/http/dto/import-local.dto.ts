import {
  IsEnum,
  IsMimeType,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UUID } from 'node:crypto';
import { MediaCategorie } from '../../../domain/enums/media-categorie.enum.js';

export class ImportLocalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nom!: string;

  @IsEnum(MediaCategorie)
  categorie!: MediaCategorie;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsMimeType()
  mimeType!: string;

  @IsString()
  @MinLength(1)
  contentBase64!: string;

  @IsOptional()
  @IsUUID()
  espaceId?: UUID;
}
