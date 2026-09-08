import { describe, expect, it } from 'vitest';
import { MemorySessionRepository } from './memory-session.repository.js';
import { Session } from '../../domain/entities/session.js';

describe('MemorySessionRepository', () => {
  it('prevents a stale save from reactivating a revoked session', async () => {
    const repository = new MemorySessionRepository();
    const session = await repository.create(
      Session.prepareCreation({
        subjectId: 'user',
        identityId: 'identity',
        ttlSeconds: 3600,
      }),
    );
    const stale = (await repository.findById(session.id))!;
    session.revoke('logout');
    await repository.save(session);
    stale.touch();
    expect((await repository.save(stale)).isActive()).toBe(false);
    expect(
      (await repository.findById(session.id))?.toPrimitives().revocationReason,
    ).toBe('logout');
  });
});
