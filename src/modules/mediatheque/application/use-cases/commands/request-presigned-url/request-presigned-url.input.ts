import type { UUID } from 'node:crypto';

export interface RequestPresignedUrlInput {
  fileName: string;
  mimeType: string;
  size: number;
  espaceId?: UUID;
}
