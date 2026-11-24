import { randomUUID } from 'node:crypto';
import { InvalidMediaException } from '../../../../domain/exceptions/invalid-media.exception.js';
import type { PendingUploadRepository } from '../../../../domain/repositories/i-pending-upload.repository.js';
import type { MediathequeConfig } from '../../../../infrastructure/mediatheque.config.js';
import type { ObjectStorageGateway } from '../../../gateways/i-object-storage.gateway.js';
import type { RequestPresignedUrlInput } from './request-presigned-url.input.js';
import type { RequestPresignedUrlOutput } from './request-presigned-url.output.js';

export class RequestPresignedUrl {
  constructor(
    private readonly storage: ObjectStorageGateway,
    private readonly pending: PendingUploadRepository,
    private readonly config: MediathequeConfig,
  ) {}

  async handle(
    input: RequestPresignedUrlInput,
  ): Promise<RequestPresignedUrlOutput> {
    const fileName = input.fileName?.trim();
    if (!fileName) throw new InvalidMediaException('fileName is required');
    if (!input.mimeType?.trim()) {
      throw new InvalidMediaException('mimeType is required');
    }
    if (!Number.isInteger(input.size) || input.size <= 0) {
      throw new InvalidMediaException('size must be a positive integer');
    }
    if (input.size > this.config.maxFileSizeBytes) {
      throw new InvalidMediaException(
        `size exceeds maximum of ${this.config.maxFileSizeBytes} bytes`,
      );
    }
    if (!this.config.allowedMimeTypes.includes(input.mimeType)) {
      throw new InvalidMediaException(
        `mimeType "${input.mimeType}" is not allowed`,
      );
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = input.espaceId
      ? `espaces/${input.espaceId}/${randomUUID()}-${safeName}`
      : `medias/${randomUUID()}-${safeName}`;

    await this.pending.save({
      key,
      mimeType: input.mimeType,
      size: input.size,
      espaceId: input.espaceId ?? null,
      createdAt: new Date(),
    });

    const uploadUrl = await this.storage.createUploadUrl({
      key,
      mimeType: input.mimeType,
      size: input.size,
    });

    return { uploadUrl, key };
  }
}
