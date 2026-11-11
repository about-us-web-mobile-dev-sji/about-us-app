import type { UUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import type {
  MediaAggregate,
  MediaRepository,
} from '../../domain/repositories/i-media.repository.js';
import { MediaMapper } from './mappers/media.mapper.js';
import { MediaOrmEntity } from './typeorm/media.entity.js';

export class TypeormMediaRepository implements MediaRepository {
  constructor(private readonly repo: Repository<MediaOrmEntity>) {}

  async save(media: MediaAggregate): Promise<MediaAggregate> {
    const saved = await this.repo.save(MediaMapper.toPersistence(media));
    return MediaMapper.toDomain(saved);
  }

  async findById(id: UUID): Promise<MediaAggregate | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? MediaMapper.toDomain(entity) : null;
  }

  async findByStorageKey(storageKey: string): Promise<MediaAggregate | null> {
    const entity = await this.repo.findOneBy({ storageKey });
    return entity ? MediaMapper.toDomain(entity) : null;
  }

  async findByEspaceId(
    espaceId: UUID,
    search?: string,
  ): Promise<MediaAggregate[]> {
    const qb = this.repo
      .createQueryBuilder('media')
      .where('media.espace_id = :espaceId', { espaceId })
      .orderBy('media.created_at', 'DESC');

    const term = search?.trim();
    if (term) {
      qb.andWhere(
        '(media.nom ILIKE :q OR media.categorie ILIKE :q OR media.url ILIKE :q OR media.type_fichier ILIKE :q OR media.storage_key ILIKE :q)',
        { q: `%${term}%` },
      );
    }

    const entities = await qb.getMany();
    return entities.map((entity) => MediaMapper.toDomain(entity));
  }

  async deleteById(id: UUID): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
