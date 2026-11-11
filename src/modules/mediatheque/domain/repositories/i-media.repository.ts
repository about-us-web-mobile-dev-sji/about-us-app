import type { UUID } from 'node:crypto';
import type { Media } from '../entities/media.entity.js';
import type { Ressource } from '../entities/ressource.entity.js';

export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

export type MediaAggregate = Media | Ressource;

export interface MediaRepository {
  save(media: MediaAggregate): Promise<MediaAggregate>;
  findById(id: UUID): Promise<MediaAggregate | null>;
  findByStorageKey(storageKey: string): Promise<MediaAggregate | null>;
  findByEspaceId(
    espaceId: UUID,
    search?: string,
  ): Promise<MediaAggregate[]>;
  deleteById(id: UUID): Promise<boolean>;
}
