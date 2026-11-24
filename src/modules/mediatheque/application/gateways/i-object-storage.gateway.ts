export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface PresignUploadParams {
  key: string;
  mimeType: string;
  size: number;
}

export interface PutObjectParams {
  key: string;
  mimeType: string;
  body: Buffer;
}

export interface ObjectStorageGateway {
  createUploadUrl(params: PresignUploadParams): Promise<string>;
  putObject(params: PutObjectParams): Promise<void>;
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
}
