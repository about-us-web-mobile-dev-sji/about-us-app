import { UUID } from "crypto";

export interface RecordEventLogInput {
  name: string;
  entityType: string;
  entityId: UUID;
  actorId?: string;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}
