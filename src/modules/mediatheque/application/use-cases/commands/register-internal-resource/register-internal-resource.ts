import { Ressource } from '../../../../domain/entities/ressource.entity.js';
import { MediaCategorie } from '../../../../domain/enums/media-categorie.enum.js';
import { InvalidMediaException } from '../../../../domain/exceptions/invalid-media.exception.js';
import type { MediaRepository } from '../../../../domain/repositories/i-media.repository.js';
import type { RegisterInternalResourceInput } from './register-internal-resource.input.js';
import type { RegisterInternalResourceOutput } from './register-internal-resource.output.js';

export class RegisterInternalResource {
  constructor(private readonly medias: MediaRepository) {}

  async handle(
    input: RegisterInternalResourceInput,
  ): Promise<RegisterInternalResourceOutput> {
    const resourceId = input.resource_id;
    const espaceId = input.espace_id;
    const url = input.url?.trim();
    const version = input.version?.trim();
    const mimeType = input.mime_type?.trim().toLowerCase();

    if (!resourceId) throw new InvalidMediaException('resource_id is required');
    if (!espaceId) throw new InvalidMediaException('espace_id is required');
    if (!url) throw new InvalidMediaException('url is required');
    if (!version) throw new InvalidMediaException('version is required');
    if (!mimeType) throw new InvalidMediaException('mime_type is required');

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new InvalidMediaException('url must be a valid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InvalidMediaException('url must use http or https');
    }

    const existing = await this.medias.findById(resourceId);
    const nom = nomFromUrl(parsed) || `resource-${resourceId.slice(0, 8)}`;
    const categorie = categorieFromMime(mimeType);
    const storageKey =
      existing instanceof Ressource
        ? existing.storageKey
        : storageKeyFromUrl(parsed, resourceId);

    const ressource = Ressource.create({
      id: resourceId,
      nom: existing?.nom ?? nom,
      url,
      taille: existing?.taille ?? 0,
      typeFichier: mimeType,
      categorie,
      storageKey,
      version,
      espaceId,
      createdAt: existing?.createdAt,
    });

    const saved = await this.medias.save(ressource);
    const p = saved.toPrimitives();
    if (!p.id) throw new InvalidMediaException('Persisted resource has no id');

    return {
      resource_id: p.id,
      espace_id: espaceId,
      url: p.url,
      version: p.version,
      mime_type: p.typeFichier,
    };
  }
}

function categorieFromMime(mimeType: string): MediaCategorie {
  if (mimeType === 'application/pdf') return MediaCategorie.PDF;
  if (mimeType.startsWith('image/')) return MediaCategorie.PHOTO;
  return MediaCategorie.DOCUMENT;
}

function nomFromUrl(url: URL): string {
  const last = url.pathname.split('/').filter(Boolean).pop() ?? '';
  try {
    return decodeURIComponent(last).slice(0, 255);
  } catch {
    return last.slice(0, 255);
  }
}

function storageKeyFromUrl(url: URL, resourceId: string): string {
  const path = url.pathname.replace(/^\/+/, '');
  // URL publique Supabase: .../object/public/<bucket>/<key>
  const marker = '/object/public/';
  const idx = url.pathname.indexOf(marker);
  if (idx >= 0) {
    const after = url.pathname.slice(idx + marker.length);
    const parts = after.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(1).join('/');
    }
  }
  if (path) return path.slice(0, 512);
  return `resources/${resourceId}`;
}
