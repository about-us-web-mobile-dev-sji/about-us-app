import { randomUUID, type UUID } from 'node:crypto';
import { Media, type MediaProps } from './media.entity.js';

export interface RessourceProps extends MediaProps {
  espaceId: UUID;
}

export class Ressource extends Media {
  protected constructor(protected props: RessourceProps) {
    super(props);
  }

  static create(
    input: Omit<RessourceProps, 'id' | 'createdAt' | 'version'> & {
      id?: UUID;
      version?: string;
      createdAt?: Date;
    },
  ): Ressource {
    return new Ressource({
      ...input,
      id: input.id ?? randomUUID(),
      version: input.version?.trim() || '1',
      createdAt: input.createdAt ?? new Date(),
    });
  }

  static reconstitute(props: RessourceProps): Ressource {
    return new Ressource(structuredClone(props));
  }

  get espaceId(): UUID {
    return this.props.espaceId;
  }

  toPrimitives(): RessourceProps {
    return structuredClone(this.props);
  }
}
