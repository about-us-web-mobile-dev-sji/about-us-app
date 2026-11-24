import type { UUID } from 'node:crypto';

export interface RegisterInternalResourceOutput {
  resource_id: UUID;
  espace_id: UUID;
  url: string;
  version: string;
  mime_type: string;
}
