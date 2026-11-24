import { MediaNotFoundException } from '../../../../domain/exceptions/media-not-found.exception.js';
import type { MediaRepository } from '../../../../domain/repositories/i-media.repository.js';
import type { ObjectStorageGateway } from '../../../gateways/i-object-storage.gateway.js';
import type { DeleteMediaInput } from './delete-media.input.js';

export class DeleteMedia {
  constructor(
    private readonly storage: ObjectStorageGateway,
    private readonly medias: MediaRepository,
  ) {}

  async handle(input: DeleteMediaInput): Promise<void> {
    const media = await this.medias.findById(input.id);
    if (!media) throw new MediaNotFoundException();

    await this.storage.deleteObject(media.storageKey);
    await this.medias.deleteById(input.id);
  }
}
