import { InvalidMediaException } from '../../../../domain/exceptions/invalid-media.exception.js';
import { MediaPersistenceService } from '../../../services/media-persistence.service.js';
import type { ImportFromUrlInput } from './import-from-url.input.js';
import type { ImportFromUrlOutput } from './import-from-url.output.js';

export class ImportFromUrl {
  constructor(private readonly persistence: MediaPersistenceService) {}

  async handle(input: ImportFromUrlInput): Promise<ImportFromUrlOutput> {
    const sourceUrl = input.sourceUrl?.trim();
    if (!sourceUrl) throw new InvalidMediaException('sourceUrl is required');

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      throw new InvalidMediaException('sourceUrl must be a valid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InvalidMediaException('sourceUrl must use http or https');
    }

    const response = await fetch(parsed, {
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new InvalidMediaException(
        `Unable to download file (HTTP ${response.status})`,
      );
    }

    const mimeType = (
      response.headers.get('content-type')?.split(';')[0]?.trim() ||
      'application/octet-stream'
    ).toLowerCase();

    const buffer = Buffer.from(await response.arrayBuffer());
    const pathName = parsed.pathname.split('/').pop() || 'download';

    return this.persistence.persist({
      nom: input.nom,
      categorie: input.categorie,
      mimeType,
      body: buffer,
      fileName: pathName,
      espaceId: input.espaceId,
    });
  }
}
