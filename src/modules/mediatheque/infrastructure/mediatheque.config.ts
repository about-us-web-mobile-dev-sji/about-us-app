export const MEDIATHEQUE_CONFIG = Symbol('MEDIATHEQUE_CONFIG');

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'audio/mpeg',
];

export interface MediathequeConfig {
  configured: boolean;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  convertApiSecret: string;
}

export function mediathequeConfig(
  env: NodeJS.ProcessEnv = process.env,
): MediathequeConfig {
  const endpoint = env.S3_ENDPOINT?.trim() ?? '';
  const region = env.S3_REGION?.trim() ?? '';
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucket = env.S3_BUCKET?.trim() ?? '';
  const configured = Boolean(
    endpoint && region && accessKeyId && secretAccessKey && bucket,
  );

  const maxRaw = env.S3_MAX_FILE_SIZE_BYTES ?? '20971520';
  const maxFileSizeBytes = Number(maxRaw);
  if (!/^\d+$/.test(maxRaw) || maxFileSizeBytes <= 0) {
    throw new Error('Invalid S3_MAX_FILE_SIZE_BYTES');
  }

  const allowedMimeTypes = (
    env.S3_ALLOWED_MIME_TYPES ?? DEFAULT_ALLOWED_MIME_TYPES.join(',')
  )
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (allowedMimeTypes.length === 0) {
    throw new Error('S3_ALLOWED_MIME_TYPES must not be empty');
  }

  const publicBaseUrl = (
    env.S3_PUBLIC_BASE_URL?.trim() ||
    (endpoint && bucket ? `${endpoint.replace(/\/$/, '')}/${bucket}` : '')
  ).replace(/\/$/, '');

  return {
    configured,
    endpoint: endpoint.replace(/\/$/, ''),
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    maxFileSizeBytes,
    allowedMimeTypes,
    convertApiSecret: env.CONVERTAPI_SECRET?.trim() ?? '',
  };
}
