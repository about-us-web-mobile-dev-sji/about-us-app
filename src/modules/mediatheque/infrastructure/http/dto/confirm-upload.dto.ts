import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { MediaCategorie } from '../../../domain/enums/media-categorie.enum.js';

export class ConfirmUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nom!: string;

  @IsEnum(MediaCategorie)
  categorie!: MediaCategorie;
}
