import { randomUUID } from 'node:crypto';
import type { UUID } from 'node:crypto';
import { Media } from '../../domain/entities/media.entity.js';
import { Ressource } from '../../domain/entities/ressource.entity.js';
import { MediaCategorie } from '../../domain/enums/media-categorie.enum.js';
import { InvalidMediaException } from '../../domain/exceptions/invalid-media.exception.js';
import type { MediaRepository } from '../../domain/repositories/i-media.repository.js';
import type { MediathequeConfig } from '../../infrastructure/mediatheque.config.js';
import type { ObjectStorageGateway } from '../gateways/i-object-storage.gateway.js';

export interface PersistMediaInput {
  nom: string;
  categorie: MediaCategorie;
  mimeType: string;
  body: Buffer;
  fileName: string;
  espaceId?: UUID;
}

export interface PersistMediaOutput {
  id: UUID;
  nom: string;
  url: string;
  taille: number;
  typeFichier: string;
  categorie: MediaCategorie;
  createdAt: Date;
  espaceId?: UUID;
}

const PHOTO_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export class MediaPersistenceService {
  constructor(
    private readonly storage: ObjectStorageGateway,
    private readonly medias: MediaRepository,
    private readonly config: MediathequeConfig,
  ) {}

  async persist(input: PersistMediaInput): Promise<PersistMediaOutput> {
    const nom = input.nom?.trim();
    if (!nom) throw new InvalidMediaException('nom is required');
    if (!input.body?.byteLength) {
      throw new InvalidMediaException('file is empty');
    }
    if (input.body.byteLength > this.config.maxFileSizeBytes) {
      throw new InvalidMediaException(
        `size exceeds maximum of ${this.config.maxFileSizeBytes} bytes`,
      );
    }

    this.assertCategorieMatchesMime(input.categorie, input.mimeType);

    const mimeType = input.mimeType.trim().toLowerCase();
    const ext = extensionFor(mimeType, input.fileName);
    const body = input.body;

    const safeNom = nom.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'media';
    const key = input.espaceId
      ? `espaces/${input.espaceId}/${randomUUID()}-${safeNom}.${ext}`
      : `medias/${randomUUID()}-${safeNom}.${ext}`;

    await this.storage.putObject({ key, mimeType, body });

    const media = input.espaceId
      ? Ressource.create({
          nom,
          url: this.storage.publicUrl(key),
          taille: body.byteLength,
          typeFichier: mimeType,
          categorie: input.categorie,
          storageKey: key,
          espaceId: input.espaceId,
        })
      : Media.create({
          nom,
          url: this.storage.publicUrl(key),
          taille: body.byteLength,
          typeFichier: mimeType,
          categorie: input.categorie,
          storageKey: key,
        });

    const saved = await this.medias.save(media);
    const p = saved.toPrimitives();
    if (!p.id) throw new InvalidMediaException('Persisted media has no id');

    const output: PersistMediaOutput = {
      id: p.id,
      nom: p.nom,
      url: p.url,
      taille: p.taille,
      typeFichier: p.typeFichier,
      categorie: p.categorie,
      createdAt: p.createdAt,
    };
    if (saved instanceof Ressource) output.espaceId = saved.espaceId;
    return output;
  }

  private assertCategorieMatchesMime(
    categorie: MediaCategorie,
    mimeType: string,
  ): void {
    if (categorie === MediaCategorie.PHOTO) {
      // La conversion WebP est faite côté frontend avant l'envoi.
      if (mimeType !== 'image/webp') {
        throw new InvalidMediaException(
          'photo category requires image/webp (convert on the client before upload)',
        );
      }
      return;
    }
    if (categorie === MediaCategorie.PDF) {
      if (mimeType !== 'application/pdf') {
        throw new InvalidMediaException('pdf category requires application/pdf');
      }
      return;
    }
    if (PHOTO_MIMES.has(mimeType) || mimeType === 'application/pdf') {
      throw new InvalidMediaException(
        'document category does not accept photos or pdf files',
      );
    }
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      throw new InvalidMediaException(`mimeType "${mimeType}" is not allowed`);
    }
  }
}

function extensionFor(mimeType: string, fileName: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
