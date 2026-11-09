import type { UUID } from 'node:crypto';
import type { MediaCategorie } from '../../../../domain/enums/media-categorie.enum.js';

export interface ImportFromUrlInput {
  nom: string;
  categorie: MediaCategorie;
  sourceUrl: string;
  espaceId?: UUID;
}
