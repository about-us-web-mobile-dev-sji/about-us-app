import type { UUID } from 'node:crypto';
import type { MediaCategorie } from '../../../../domain/enums/media-categorie.enum.js';

export interface ImportLocalInput {
  nom: string;
  categorie: MediaCategorie;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  espaceId?: UUID;
}
