import { InvalidMediaException } from '../../domain/exceptions/invalid-media.exception.js';
import type {
  ImageConversionInput,
  ImageConversionResult,
  ImageConverterGateway,
} from '../../application/gateways/i-image-converter.gateway.js';

const MIME_TO_CONVERTAPI_FROM: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

export class ConvertApiImageConverter implements ImageConverterGateway {
  constructor(private readonly apiToken: string) {}

  async toWebp(input: ImageConversionInput): Promise<ImageConversionResult> {
    if (!this.apiToken) {
      throw new InvalidMediaException(
        'CONVERTAPI_SECRET is required to convert images to WebP',
      );
    }
    if (input.mimeType === 'image/webp') {
      return { body: input.body, mimeType: 'image/webp' };
    }

    const from = MIME_TO_CONVERTAPI_FROM[input.mimeType];
    if (!from) {
      throw new InvalidMediaException(
        `Cannot convert mimeType "${input.mimeType}" to WebP`,
      );
    }

    const form = new FormData();
    form.append(
      'File',
      new Blob([new Uint8Array(input.body)], { type: input.mimeType }),
      input.fileName || `image.${from}`,
    );
    form.append('StoreFile', 'false');

    const response = await fetch(
      `https://v2.convertapi.com/convert/${from}/to/webp`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiToken}` },
        body: form,
        signal: AbortSignal.timeout(60_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new InvalidMediaException(
        `ConvertAPI failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const payload = (await response.json()) as {
      Files?: Array<{ FileData?: string }>;
    };
    const fileData = payload.Files?.[0]?.FileData;
    if (!fileData) {
      throw new InvalidMediaException('ConvertAPI returned no file data');
    }

    return {
      body: Buffer.from(fileData, 'base64'),
      mimeType: 'image/webp',
    };
  }
}
