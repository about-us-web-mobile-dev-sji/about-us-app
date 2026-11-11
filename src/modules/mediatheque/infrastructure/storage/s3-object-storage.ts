import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  ObjectStorageGateway,
  PresignUploadParams,
  PutObjectParams,
} from '../../application/gateways/i-object-storage.gateway.js';
import { InvalidMediaException } from '../../domain/exceptions/invalid-media.exception.js';
import type { MediathequeConfig } from '../mediatheque.config.js';

export class S3ObjectStorage implements ObjectStorageGateway {
  private readonly client: S3Client | null;

  constructor(private readonly config: MediathequeConfig) {
    this.client = config.configured
      ? new S3Client({
          endpoint: config.endpoint,
          region: config.region,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          forcePathStyle: true,
        })
      : null;
  }

  private requireClient(): S3Client {
    if (!this.client || !this.config.configured) {
      throw new InvalidMediaException(
        'Storage S3 is not configured (set S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET)',
      );
    }
    return this.client;
  }

  async createUploadUrl(params: PresignUploadParams): Promise<string> {
    const client = this.requireClient();
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: params.key,
      ContentType: params.mimeType,
      ContentLength: params.size,
    });
    return getSignedUrl(client, command, { expiresIn: 600 });
  }

  async putObject(params: PutObjectParams): Promise<void> {
    const client = this.requireClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: params.key,
        ContentType: params.mimeType,
        Body: params.body,
        ContentLength: params.body.byteLength,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    const client = this.requireClient();
    await client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  publicUrl(key: string): string {
    if (!this.config.publicBaseUrl) {
      throw new InvalidMediaException(
        'Storage S3 is not configured (missing S3_PUBLIC_BASE_URL / endpoint)',
      );
    }
    return `${this.config.publicBaseUrl}/${key}`;
  }
}
