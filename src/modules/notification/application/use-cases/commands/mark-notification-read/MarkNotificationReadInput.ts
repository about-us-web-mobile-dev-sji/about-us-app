import type { UUID } from 'node:crypto';

export interface MarkNotificationReadInput {
  recipientId: string;
  id?: UUID;
}
