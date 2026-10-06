import type { ActiveSessionOutput } from '../../../application/use-cases/queries/list-sessions/ListSessionsOutput.js';

export interface SessionResponseDto {
  id: string;
  clientType: 'WEB' | 'MOBILE';
  userAgent: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  current: boolean;
}

export function toSessionResponse(session: ActiveSessionOutput): SessionResponseDto {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}
