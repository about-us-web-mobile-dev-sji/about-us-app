export const IMAGE_CONVERTER = Symbol('IMAGE_CONVERTER');

export interface ImageConversionInput {
  body: Buffer;
  mimeType: string;
  fileName: string;
}

export interface ImageConversionResult {
  body: Buffer;
  mimeType: 'image/webp';
}

export interface ImageConverterGateway {
  toWebp(input: ImageConversionInput): Promise<ImageConversionResult>;
}
