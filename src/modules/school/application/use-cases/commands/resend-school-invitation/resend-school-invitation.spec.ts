import { describe, expect, it, vi } from 'vitest';
import { ResendSchoolInvitationUseCase } from './resend-school-invitation.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import { SchoolInvitationInvalidException } from '../../../../domain/exceptions/school-invitation-invalid.exception.js';
import { SchoolInvitationNotFoundException } from '../../../../domain/exceptions/school-invitation-not-found.exception.js';
import { SchoolMembershipActionForbiddenException } from '../../../../domain/exceptions/school-membership-action-forbidden.exception.js';
import type { InviteSchoolMemberUseCase } from '../invite-school-member/invite-school-member.js';
import {
  SCHOOL_ID,
  inMemoryInvitations,
  membershipOf,
  pendingInvitation,
  world,
} from '../../../testing/school-test-helpers.js';

describe('ResendSchoolInvitationUseCase', () => {
  const setup = () => {
    const w = world([membershipOf('admin', SchoolRole.ADMIN), membershipOf('staff', SchoolRole.MEMBER)]);
    const invitations = inMemoryInvitations([
      pendingInvitation('i-expired', 'late@ecole.test', SchoolRole.MEMBER, { expiresAt: new Date(2020, 0, 1) }),
      pendingInvitation('i-accepted', 'done@ecole.test', SchoolRole.MEMBER, { status: InvitationStatus.ACCEPTED }),
    ]);
    const invite = { handle: vi.fn(async () => ({ invitation: {} })) };
    return {
      useCase: new ResendSchoolInvitationUseCase(
        invitations.repo,
        w.authorization,
        invite as unknown as InviteSchoolMemberUseCase,
      ),
      invite,
    };
  };

  it('invites the same address again', async () => {
    const { useCase, invite } = setup();
    await useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'i-expired', performedBy: 'admin' });
    expect(invite.handle).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: SCHOOL_ID, email: 'late@ecole.test', performedBy: 'admin' }),
    );
  });

  it('refuses an accepted invitation, an unknown one and a member', async () => {
    const { useCase, invite } = setup();
    await expect(
      useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'i-accepted', performedBy: 'admin' }),
    ).rejects.toBeInstanceOf(SchoolInvitationInvalidException);
    await expect(
      useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'ghost', performedBy: 'admin' }),
    ).rejects.toBeInstanceOf(SchoolInvitationNotFoundException);
    await expect(
      useCase.handle({ schoolId: SCHOOL_ID, invitationId: 'i-expired', performedBy: 'staff' }),
    ).rejects.toBeInstanceOf(SchoolMembershipActionForbiddenException);
    expect(invite.handle).not.toHaveBeenCalled();
  });
});
