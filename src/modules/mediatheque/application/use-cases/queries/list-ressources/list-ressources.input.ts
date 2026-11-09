import type { UUID } from 'node:crypto';

export interface ListRessourcesInput {
  espaceId: UUID;
  search?: string;
}
