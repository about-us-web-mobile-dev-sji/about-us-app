import type { RevokeAllSessionsInput } from './RevokeAllSessionsInput.js';
import type { RevokeAllSessionsOutput } from './RevokeAllSessionsOutput.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';

/** UC-22: signs the user out of every device, the current one included. */
export class RevokeAllSessionsUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async handle(input: RevokeAllSessionsInput): Promise<RevokeAllSessionsOutput> {
    const active = (await this.sessions.findBySubjectId(input.subjectId)).filter(
      (session) => session.isActive(),
    );
    for (const session of active) {
      session.revoke('logout_everywhere');
      await this.sessions.save(session);
    }
    return { revokedCount: active.length };
  }
}
