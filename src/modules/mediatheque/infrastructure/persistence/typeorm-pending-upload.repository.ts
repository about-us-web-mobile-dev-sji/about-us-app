import type { Repository } from 'typeorm';
import type {
  PendingUpload,
  PendingUploadRepository,
} from '../../domain/repositories/i-pending-upload.repository.js';
import { PendingUploadOrmEntity } from './typeorm/pending-upload.entity.js';

export class TypeormPendingUploadRepository implements PendingUploadRepository {
  constructor(private readonly repo: Repository<PendingUploadOrmEntity>) {}

  async save(pending: PendingUpload): Promise<PendingUpload> {
    const entity = new PendingUploadOrmEntity();
    entity.key = pending.key;
    entity.mimeType = pending.mimeType;
    entity.size = String(pending.size);
    entity.espaceId = pending.espaceId;
    entity.createdAt = pending.createdAt;
    const saved = await this.repo.save(entity);
    return {
      key: saved.key,
      mimeType: saved.mimeType,
      size: Number(saved.size),
      espaceId: saved.espaceId,
      createdAt: saved.createdAt,
    };
  }

  async findByKey(key: string): Promise<PendingUpload | null> {
    const saved = await this.repo.findOneBy({ key });
    if (!saved) return null;
    return {
      key: saved.key,
      mimeType: saved.mimeType,
      size: Number(saved.size),
      espaceId: saved.espaceId,
      createdAt: saved.createdAt,
    };
  }

  async deleteByKey(key: string): Promise<void> {
    await this.repo.delete({ key });
  }
}
