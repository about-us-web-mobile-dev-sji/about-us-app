import type { ListSessionsInput } from './ListSessionsInput.js';
import type { ListSessionsOutput } from './ListSessionsOutput.js';
import type { SessionRepository } from '../../../../domain/repositories/session.repositories.js';

/** UC-21: the user's active sessions (devices), most recently used first. */
export class ListSessionsUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async handle(input: ListSessionsInput): Promise<ListSessionsOutput> {
    const sessions = await this.sessions.findBySubjectId(input.subjectId);
    return sessions
      .filter((session) => session.isActive())
      .map((session) => {
        const props = session.toPrimitives();
        return {
          id: props.id,
          clientType: props.clientType ?? 'WEB',
          userAgent: props.userAgent ?? null,
          createdAt: props.createdAt,
          lastActivityAt: props.lastActivityAt,
          expiresAt: props.expiresAt,
          current: props.id === input.currentSessionId,
        };
      })
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }
}
