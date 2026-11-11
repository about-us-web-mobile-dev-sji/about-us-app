import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { ObjectStorageGateway } from './application/gateways/i-object-storage.gateway.js';
import { ConfirmUpload } from './application/use-cases/commands/confirm-upload/confirm-upload.js';
import { DeleteMedia } from './application/use-cases/commands/delete-media/delete-media.js';
import { RequestPresignedUrl } from './application/use-cases/commands/request-presigned-url/request-presigned-url.js';
import { Media } from './domain/entities/media.entity.js';
import { MediaCategorie } from './domain/enums/media-categorie.enum.js';
import { InvalidMediaException } from './domain/exceptions/invalid-media.exception.js';
import { MediaNotFoundException } from './domain/exceptions/media-not-found.exception.js';
import type { MediaRepository } from './domain/repositories/i-media.repository.js';
import type { PendingUploadRepository } from './domain/repositories/i-pending-upload.repository.js';
import type { MediathequeConfig } from './infrastructure/mediatheque.config.js';

const config: MediathequeConfig = {
  configured: true,
  endpoint: 'https://example.storage.supabase.co/storage/v1/s3',
  region: 'eu-west-1',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'media',
  publicBaseUrl: 'https://example.supabase.co/storage/v1/object/public/media',
  maxFileSizeBytes: 1024,
  allowedMimeTypes: ['image/png', 'application/pdf'],
};

describe('RequestPresignedUrl', () => {
  it('rejects disallowed mime types', async () => {
    const storage = {
      createUploadUrl: vi.fn(),
    } as unknown as ObjectStorageGateway;
    const pending = { save: vi.fn() } as unknown as PendingUploadRepository;
    const useCase = new RequestPresignedUrl(storage, pending, config);

    await expect(
      useCase.handle({
        fileName: 'a.txt',
        mimeType: 'text/plain',
        size: 10,
      }),
    ).rejects.toBeInstanceOf(InvalidMediaException);
  });

  it('returns uploadUrl and key for a valid request', async () => {
    const storage = {
      createUploadUrl: vi.fn().mockResolvedValue('https://upload'),
    } as unknown as ObjectStorageGateway;
    const pending = {
      save: vi.fn().mockImplementation(async (p) => p),
    } as unknown as PendingUploadRepository;
    const useCase = new RequestPresignedUrl(storage, pending, config);

    const result = await useCase.handle({
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 100,
    });

    expect(result.uploadUrl).toBe('https://upload');
    expect(result.key).toContain('medias/');
    expect(pending.save).toHaveBeenCalledOnce();
  });
});

describe('ConfirmUpload', () => {
  it('creates a media entry from a pending upload', async () => {
    const key = `medias/${randomUUID()}-photo.png`;
    const storage = {
      publicUrl: (k: string) => `https://cdn/${k}`,
    } as unknown as ObjectStorageGateway;
    const pending = {
      findByKey: vi.fn().mockResolvedValue({
        key,
        mimeType: 'image/png',
        size: 100,
        espaceId: null,
        createdAt: new Date(),
      }),
      deleteByKey: vi.fn(),
    } as unknown as PendingUploadRepository;
    const medias = {
      findByStorageKey: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation(async (m: Media) =>
        Media.reconstitute({ ...m.toPrimitives(), id: randomUUID() }),
      ),
    } as unknown as MediaRepository;

    const result = await new ConfirmUpload(storage, pending, medias).handle({
      key,
      nom: 'Photo test',
      categorie: MediaCategorie.PHOTO,
    });
    expect(result.url).toBe(`https://cdn/${key}`);
    expect(result.nom).toBe('Photo test');
    expect(result.categorie).toBe(MediaCategorie.PHOTO);
    expect(result.taille).toBe(100);
    expect(pending.deleteByKey).toHaveBeenCalledWith(key);
  });
});

describe('DeleteMedia', () => {
  it('deletes storage object then database row', async () => {
    const id = randomUUID();
    const storage = {
      deleteObject: vi.fn(),
    } as unknown as ObjectStorageGateway;
    const medias = {
      findById: vi.fn().mockResolvedValue(
        Media.reconstitute({
          id,
          nom: 'a',
          url: 'https://cdn/a',
          taille: 1,
          typeFichier: 'image/png',
          categorie: MediaCategorie.PHOTO,
          storageKey: 'medias/a',
          createdAt: new Date(),
        }),
      ),
      deleteById: vi.fn().mockResolvedValue(true),
    } as unknown as MediaRepository;

    await new DeleteMedia(storage, medias).handle({ id });
    expect(storage.deleteObject).toHaveBeenCalledWith('medias/a');
    expect(medias.deleteById).toHaveBeenCalledWith(id);
  });

  it('throws when media is missing', async () => {
    const storage = { deleteObject: vi.fn() } as unknown as ObjectStorageGateway;
    const medias = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as MediaRepository;

    await expect(
      new DeleteMedia(storage, medias).handle({ id: randomUUID() }),
    ).rejects.toBeInstanceOf(MediaNotFoundException);
  });
});
