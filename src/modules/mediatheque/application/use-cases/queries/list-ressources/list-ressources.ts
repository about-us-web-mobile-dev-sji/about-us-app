import { InvalidMediaException } from '../../../../domain/exceptions/invalid-media.exception.js';
import { Ressource } from '../../../../domain/entities/ressource.entity.js';
import type { MediaRepository } from '../../../../domain/repositories/i-media.repository.js';
import type { ListRessourcesInput } from './list-ressources.input.js';
import type { ListRessourcesOutput } from './list-ressources.output.js';

export class ListRessources {
  constructor(private readonly medias: MediaRepository) {}

  async handle(input: ListRessourcesInput): Promise<ListRessourcesOutput> {
    if (!input.espaceId) {
      throw new InvalidMediaException('espaceId is required');
    }

    const items = await this.medias.findByEspaceId(
      input.espaceId,
      input.search,
    );

    return {
      items: items.map((media) => {
        if (!(media instanceof Ressource)) {
          throw new InvalidMediaException('Expected a ressource for espace');
        }
        const p = media.toPrimitives();
        if (!p.id) throw new InvalidMediaException('Persisted media has no id');
        return {
          id: p.id,
          nom: p.nom,
          url: p.url,
          taille: p.taille,
          typeFichier: p.typeFichier,
          categorie: p.categorie,
          createdAt: p.createdAt,
          espaceId: p.espaceId,
        };
      }),
    };
  }
}
