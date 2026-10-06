import type { RevokeSessionInput } from './RevokeSessionInput.js';
import type { RevokeSessionOutput } from './RevokeSessionOutput.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';
import { SessionNotFoundException } from '../../../../domain/exceptions/session-not-found.exception.js';

/** UC-21: signs one of the user's devices out. */
export class RevokeSessionUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async handle(input: RevokeSessionInput): Promise<RevokeSessionOutput> {
    const session = await this.sessions.findById(input.sessionId);
    // Someone else's session is reported as missing, never as forbidden.
    if (!session?.isActive() || session.subjectId !== input.subjectId)
      throw new SessionNotFoundException();
    session.revoke('revoked_by_user');
    await this.sessions.save(session);
    return { revokedCurrent: session.id === input.currentSessionId };
  }
}
