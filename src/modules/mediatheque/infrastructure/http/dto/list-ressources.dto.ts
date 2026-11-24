import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { UUID } from 'node:crypto';

export class ListRessourcesDto {
  @IsUUID()
  espaceId!: UUID;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
