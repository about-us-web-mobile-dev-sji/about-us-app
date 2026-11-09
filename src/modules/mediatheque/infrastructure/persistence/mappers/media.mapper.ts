import { Media } from '../../../domain/entities/media.entity.js';
import { Ressource } from '../../../domain/entities/ressource.entity.js';
import type { MediaAggregate } from '../../../domain/repositories/i-media.repository.js';
import { MediaOrmEntity } from '../typeorm/media.entity.js';

export class MediaMapper {
  static toDomain(entity: MediaOrmEntity): MediaAggregate {
    const base = {
      id: entity.id,
      nom: entity.nom,
      url: entity.url,
      taille: Number(entity.taille),
      typeFichier: entity.typeFichier,
      categorie: entity.categorie,
      storageKey: entity.storageKey,
      createdAt: entity.createdAt,
    };
    if (entity.espaceId) {
      return Ressource.reconstitute({ ...base, espaceId: entity.espaceId });
    }
    return Media.reconstitute(base);
  }

  static toPersistence(media: MediaAggregate): MediaOrmEntity {
    const primitives = media.toPrimitives();
    const entity = new MediaOrmEntity();
    if (primitives.id) entity.id = primitives.id;
    entity.nom = primitives.nom;
    entity.url = primitives.url;
    entity.taille = String(primitives.taille);
    entity.typeFichier = primitives.typeFichier;
    entity.categorie = primitives.categorie;
    entity.storageKey = primitives.storageKey;
    entity.createdAt = primitives.createdAt;
    entity.espaceId =
      'espaceId' in primitives
        ? (primitives.espaceId as typeof entity.espaceId)
        : null;
    return entity;
  }
}
