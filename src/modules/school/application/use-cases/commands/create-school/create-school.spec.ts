import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateSchoolUseCase } from './create-school.js';
import { School } from '../../../../domain/entities/school.entity.js';
import { SchoolInvitation } from '../../../../domain/entities/school-invitation.entity.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';

describe('CreateSchoolUseCase invitation', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const emit = vi.fn();
  let saved: SchoolInvitation[];

  const setup = () => {
    saved = [];
    const schools = {
      findByName: async () => null,
      save: async (school: School) =>
        School.reconstitute({ ...school.toPrimitives(), id: schoolId }),
    } as unknown as SchoolRepository;
    const invitations: SchoolInvitationRepository = {
      findByTokenHash: async () => null,
      findPendingBySchoolAndEmail: async () => [],
      save: async (invitation) => {
        saved.push(invitation);
        return invitation;
      },
    };
    return new CreateSchoolUseCase(schools, invitations, { emit } as never);
  };

  beforeEach(() => {
    emit.mockClear();
  });

  it('issues a pending admin invitation and sends the token only through the event', async () => {
    const output = await setup().handle({
      name: 'École test',
      email: 'Admin@Ecole.test',
      createdBy: 'creator',
    });

    expect(saved).toHaveLength(1);
    const invitation = saved[0].toPrimitives();
    expect(invitation).toMatchObject({
      schoolId,
      email: 'admin@ecole.test',
      role: MembershipRole.SCHOOL_ADMIN,
      status: InvitationStatus.PENDING,
      invitedBy: 'creator',
    });
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(emit).toHaveBeenCalledTimes(1);
    const [name, event] = emit.mock.calls[0];
    expect(name).toBe('invitation.sent');
    expect(event.invitationToken).toMatch(/^[0-9a-f]{64}$/);
    
    expect(invitation.tokenHash).toBe(SchoolInvitation.hashToken(event.invitationToken));
    expect(invitation.tokenHash).not.toBe(event.invitationToken);

    expect(JSON.stringify(output)).not.toContain(event.invitationToken);
    expect(output).not.toHaveProperty('adminUserId');
  });

  it('sends no invitation when the school has no email', async () => {
    await setup().handle({ name: 'École test', createdBy: 'creator' });

    expect(saved).toHaveLength(0);
    expect(emit).not.toHaveBeenCalled();
  });
});
