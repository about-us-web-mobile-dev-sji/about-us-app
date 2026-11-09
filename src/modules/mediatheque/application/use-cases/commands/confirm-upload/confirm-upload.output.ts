import type { UUID } from 'node:crypto';
import type { MediaCategorie } from '../../../../domain/enums/media-categorie.enum.js';

export interface ConfirmUploadOutput {
  id: UUID;
  nom: string;
  url: string;
  taille: number;
  typeFichier: string;
  categorie: MediaCategorie;
  createdAt: Date;
  espaceId?: UUID;
}
