import type { UUID } from 'node:crypto';
import type { MediaCategorie } from '../enums/media-categorie.enum.js';

export interface MediaProps {
  id?: UUID;
  nom: string;
  url: string;
  taille: number;
  typeFichier: string;
  categorie: MediaCategorie;
  storageKey: string;
  createdAt: Date;
}

export class Media {
  protected constructor(protected props: MediaProps) {}

  static create(
    input: Omit<MediaProps, 'id' | 'createdAt'> & { createdAt?: Date },
  ): Media {
    return new Media({
      ...input,
      id: undefined,
      createdAt: input.createdAt ?? new Date(),
    });
  }

  static reconstitute(props: MediaProps): Media {
    return new Media(structuredClone(props));
  }

  get id(): UUID | undefined {
    return this.props.id;
  }

  get nom(): string {
    return this.props.nom;
  }

  get url(): string {
    return this.props.url;
  }

  get taille(): number {
    return this.props.taille;
  }

  get typeFichier(): string {
    return this.props.typeFichier;
  }

  get categorie(): MediaCategorie {
    return this.props.categorie;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPrimitives(): MediaProps {
    return structuredClone(this.props);
  }
}
