import type { UUID } from 'node:crypto';

export const PENDING_UPLOAD_REPOSITORY = Symbol('PENDING_UPLOAD_REPOSITORY');

export interface PendingUpload {
  key: string;
  mimeType: string;
  size: number;
  espaceId: UUID | null;
  createdAt: Date;
}

export interface PendingUploadRepository {
  save(pending: PendingUpload): Promise<PendingUpload>;
  findByKey(key: string): Promise<PendingUpload | null>;
  deleteByKey(key: string): Promise<void>;
}
