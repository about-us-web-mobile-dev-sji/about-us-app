import { describe, expect, it } from 'vitest';
import { CancelSchoolInvitationUseCase } from './cancel-school-invitation.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { SchoolInvitationInvalidException } from '../../../../domain/exceptions/school-invitation-invalid.exception.js';
import { SchoolInvitationNotFoundException } from '../../../../domain/exceptions/school-invitation-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import {
  SCHOOL_ID,
  inMemoryInvitations,
  membershipOf,
  pendingInvitation,
  world,
} from '../../../testing/school-test-helpers.js';

describe('CancelSchoolInvitationUseCase', () => {
  const setup = () => {
    const w = world([membershipOf('admin', SchoolRole.ADMIN), membershipOf('staff', SchoolRole.MEMBER)]);
    const invitations = inMemoryInvitations([
      pendingInvitation('i-1', 'new@ecole.test'),
      pendingInvitation('i-accepted', 'old@ecole.test', SchoolRole.MEMBER, { status: InvitationStatus.ACCEPTED }),
      pendingInvitation('i-other', 'x@ecole.test', SchoolRole.MEMBER, { schoolId: 'other-school' }),
    ]);
    return { useCase: new CancelSchoolInvitationUseCase(invitations.repo, w.authorization), invitations };
  };

  it('cancels a pending invitation', async () => {
    const { useCase, invitations } = setup();
    const out = await useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'i-1', performedBy: 'admin' });
    expect(out.invitation.status).toBe(InvitationStatus.CANCELLED);
    expect(invitations.all().find((i) => i.id === 'i-1')?.status).toBe(InvitationStatus.CANCELLED);
  });

  it('refuses an accepted invitation, an unknown one and one of another school', async () => {
    const { useCase } = setup();
    await expect(
      useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'i-accepted', performedBy: 'admin' }),
    ).rejects.toBeInstanceOf(SchoolInvitationInvalidException);
    for (const invitationId of ['ghost', 'i-other']) {
      await expect(
        useCase.handle({ schoolId: SCHOOL_ID, invitationId, performedBy: 'admin' }),
      ).rejects.toBeInstanceOf(SchoolInvitationNotFoundException);
    }
  });

  it('refuses a member', async () => {
    const { useCase } = setup();
    await expect(
      useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'i-1', performedBy: 'staff' }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
  });
});
