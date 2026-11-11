import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DatabaseModule } from '../../shared/infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  OBJECT_STORAGE,
  type ObjectStorageGateway,
} from './application/gateways/i-object-storage.gateway.js';
import { MediaPersistenceService } from './application/services/media-persistence.service.js';
import { ConfirmUpload } from './application/use-cases/commands/confirm-upload/confirm-upload.js';
import { DeleteMedia } from './application/use-cases/commands/delete-media/delete-media.js';
import { ImportFromUrl } from './application/use-cases/commands/import-from-url/import-from-url.js';
import { ImportLocal } from './application/use-cases/commands/import-local/import-local.js';
import { RequestPresignedUrl } from './application/use-cases/commands/request-presigned-url/request-presigned-url.js';
import { ListRessources } from './application/use-cases/queries/list-ressources/list-ressources.js';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from './domain/repositories/i-media.repository.js';
import {
  PENDING_UPLOAD_REPOSITORY,
  type PendingUploadRepository,
} from './domain/repositories/i-pending-upload.repository.js';
import { MediathequeExceptionFilter } from './infrastructure/http/mediatheque-exception.filter.js';
import { MediathequeController } from './infrastructure/http/mediatheque.controller.js';
import {
  MEDIATHEQUE_CONFIG,
  mediathequeConfig,
  type MediathequeConfig,
} from './infrastructure/mediatheque.config.js';
import { TypeormMediaRepository } from './infrastructure/persistence/typeorm-media.repository.js';
import { TypeormPendingUploadRepository } from './infrastructure/persistence/typeorm-pending-upload.repository.js';
import { MediaOrmEntity } from './infrastructure/persistence/typeorm/media.entity.js';
import { PendingUploadOrmEntity } from './infrastructure/persistence/typeorm/pending-upload.entity.js';
import { S3ObjectStorage } from './infrastructure/storage/s3-object-storage.js';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([MediaOrmEntity, PendingUploadOrmEntity]),
    AuthModule,
  ],
  controllers: [MediathequeController],
  providers: [
    { provide: APP_FILTER, useClass: MediathequeExceptionFilter },
    { provide: MEDIATHEQUE_CONFIG, useFactory: () => mediathequeConfig() },
    {
      provide: OBJECT_STORAGE,
      inject: [MEDIATHEQUE_CONFIG],
      useFactory: (config: MediathequeConfig) => new S3ObjectStorage(config),
    },
    {
      provide: MEDIA_REPOSITORY,
      useFactory: (repo: Repository<MediaOrmEntity>) =>
        new TypeormMediaRepository(repo),
      inject: [getRepositoryToken(MediaOrmEntity)],
    },
    {
      provide: PENDING_UPLOAD_REPOSITORY,
      useFactory: (repo: Repository<PendingUploadOrmEntity>) =>
        new TypeormPendingUploadRepository(repo),
      inject: [getRepositoryToken(PendingUploadOrmEntity)],
    },
    {
      provide: MediaPersistenceService,
      inject: [OBJECT_STORAGE, MEDIA_REPOSITORY, MEDIATHEQUE_CONFIG],
      useFactory: (
        storage: ObjectStorageGateway,
        medias: MediaRepository,
        config: MediathequeConfig,
      ) => new MediaPersistenceService(storage, medias, config),
    },
    {
      provide: RequestPresignedUrl,
      inject: [OBJECT_STORAGE, PENDING_UPLOAD_REPOSITORY, MEDIATHEQUE_CONFIG],
      useFactory: (
        storage: ObjectStorageGateway,
        pending: PendingUploadRepository,
        config: MediathequeConfig,
      ) => new RequestPresignedUrl(storage, pending, config),
    },
    {
      provide: ConfirmUpload,
      inject: [OBJECT_STORAGE, PENDING_UPLOAD_REPOSITORY, MEDIA_REPOSITORY],
      useFactory: (
        storage: ObjectStorageGateway,
        pending: PendingUploadRepository,
        medias: MediaRepository,
      ) => new ConfirmUpload(storage, pending, medias),
    },
    {
      provide: DeleteMedia,
      inject: [OBJECT_STORAGE, MEDIA_REPOSITORY],
      useFactory: (storage: ObjectStorageGateway, medias: MediaRepository) =>
        new DeleteMedia(storage, medias),
    },
    {
      provide: ImportFromUrl,
      inject: [MediaPersistenceService],
      useFactory: (persistence: MediaPersistenceService) =>
        new ImportFromUrl(persistence),
    },
    {
      provide: ImportLocal,
      inject: [MediaPersistenceService],
      useFactory: (persistence: MediaPersistenceService) =>
        new ImportLocal(persistence),
    },
    {
      provide: ListRessources,
      inject: [MEDIA_REPOSITORY],
      useFactory: (medias: MediaRepository) => new ListRessources(medias),
    },
  ],
})
export class MediathequeModule {}
