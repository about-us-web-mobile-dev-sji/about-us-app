import type { MediaCategorie } from '../../../../domain/enums/media-categorie.enum.js';

export interface ConfirmUploadInput {
  key: string;
  nom: string;
  categorie: MediaCategorie;
}
