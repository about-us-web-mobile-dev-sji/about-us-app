import type { UUID } from 'node:crypto';
import { Media } from '../../../../domain/entities/media.entity.js';
import { Ressource } from '../../../../domain/entities/ressource.entity.js';
import { MediaCategorie } from '../../../../domain/enums/media-categorie.enum.js';
import { InvalidMediaException } from '../../../../domain/exceptions/invalid-media.exception.js';
import { MediaNotFoundException } from '../../../../domain/exceptions/media-not-found.exception.js';
import type {
  MediaAggregate,
  MediaRepository,
} from '../../../../domain/repositories/i-media.repository.js';
import type { PendingUploadRepository } from '../../../../domain/repositories/i-pending-upload.repository.js';
import type { ObjectStorageGateway } from '../../../gateways/i-object-storage.gateway.js';
import type { ConfirmUploadInput } from './confirm-upload.input.js';
import type { ConfirmUploadOutput } from './confirm-upload.output.js';

export class ConfirmUpload {
  constructor(
    private readonly storage: ObjectStorageGateway,
    private readonly pending: PendingUploadRepository,
    private readonly medias: MediaRepository,
  ) {}

  async handle(input: ConfirmUploadInput): Promise<ConfirmUploadOutput> {
    const key = input.key?.trim();
    if (!key) throw new InvalidMediaException('key is required');
    const nom = input.nom?.trim();
    if (!nom) throw new InvalidMediaException('nom is required');
    if (!input.categorie) {
      throw new InvalidMediaException('categorie is required');
    }
    if (!Object.values(MediaCategorie).includes(input.categorie)) {
      throw new InvalidMediaException('categorie is invalid');
    }

    const existing = await this.medias.findByStorageKey(key);
    if (existing) return this.toOutput(existing);

    const pending = await this.pending.findByKey(key);
    if (!pending) throw new MediaNotFoundException('Upload intent not found');

    const media = pending.espaceId
      ? Ressource.create({
          nom,
          url: this.storage.publicUrl(key),
          taille: pending.size,
          typeFichier: pending.mimeType,
          categorie: input.categorie,
          storageKey: key,
          espaceId: pending.espaceId,
        })
      : Media.create({
          nom,
          url: this.storage.publicUrl(key),
          taille: pending.size,
          typeFichier: pending.mimeType,
          categorie: input.categorie,
          storageKey: key,
        });

    const saved = await this.medias.save(media);
    await this.pending.deleteByKey(key);
    return this.toOutput(saved);
  }

  private toOutput(media: MediaAggregate): ConfirmUploadOutput {
    const p = media.toPrimitives();
    if (!p.id) throw new InvalidMediaException('Persisted media has no id');
    const output: ConfirmUploadOutput = {
      id: p.id,
      nom: p.nom,
      url: p.url,
      taille: p.taille,
      typeFichier: p.typeFichier,
      categorie: p.categorie,
      createdAt: p.createdAt,
    };
    if (media instanceof Ressource) {
      output.espaceId = media.espaceId as UUID;
    }
    return output;
  }
}
