import { InvalidMediaException } from '../../../../domain/exceptions/invalid-media.exception.js';
import { MediaPersistenceService } from '../../../services/media-persistence.service.js';
import type { ImportLocalInput } from './import-local.input.js';
import type { ImportLocalOutput } from './import-local.output.js';

export class ImportLocal {
  constructor(private readonly persistence: MediaPersistenceService) {}

  async handle(input: ImportLocalInput): Promise<ImportLocalOutput> {
    const fileName = input.fileName?.trim();
    if (!fileName) throw new InvalidMediaException('fileName is required');
    if (!input.mimeType?.trim()) {
      throw new InvalidMediaException('mimeType is required');
    }
    const raw = input.contentBase64?.trim();
    if (!raw) throw new InvalidMediaException('contentBase64 is required');

    const base64 = raw.includes(',') ? raw.split(',').pop()! : raw;
    let body: Buffer;
    try {
      body = Buffer.from(base64, 'base64');
    } catch {
      throw new InvalidMediaException('contentBase64 is invalid');
    }
    if (!body.byteLength) {
      throw new InvalidMediaException('file is empty');
    }

    return this.persistence.persist({
      nom: input.nom,
      categorie: input.categorie,
      mimeType: input.mimeType.trim().toLowerCase(),
      body,
      fileName,
      espaceId: input.espaceId,
    });
  }
}
