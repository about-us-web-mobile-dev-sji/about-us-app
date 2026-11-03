import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolInvitationInvalidException } from '../../../../domain/exceptions/school-invitation-invalid.exception.js';
import { SchoolInvitationNotFoundException } from '../../../../domain/exceptions/school-invitation-not-found.exception.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import type { InviteSchoolMemberUseCase } from '../invite-school-member/invite-school-member.js';
import type { InviteSchoolMemberOutput } from '../invite-school-member/invite-school-member.output.js';
import type { ResendSchoolInvitationInput } from './resend-school-invitation.input.js';

/**
 * Sends a fresh invitation (new token, new expiry) to the address of an
 * existing one. The invitation flow cancels the earlier pending ones.
 */
export class ResendSchoolInvitationUseCase {
  constructor(
    private readonly invitations: SchoolInvitationRepository,
    private readonly authorization: SchoolAuthorizationService,
    private readonly invite: InviteSchoolMemberUseCase,
  ) {}

  async handle(input: ResendSchoolInvitationInput): Promise<InviteSchoolMemberOutput> {
    if (!input.schoolId?.trim() || !input.invitationId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID and invitation ID are required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    const actor = { userId: input.performedBy, platformAdmin: input.platformAdmin };
    await this.authorization.assertSchoolAdmin(actor, input.schoolId);

    const invitation = await this.invitations.findById(input.invitationId);
    if (!invitation || invitation.schoolId !== input.schoolId) {
      throw new SchoolInvitationNotFoundException(input.schoolId, input.invitationId);
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new SchoolInvitationInvalidException('This invitation has already been accepted');
    }

    return this.invite.handle({
      schoolId: input.schoolId,
      email: invitation.email,
      performedBy: input.performedBy,
      platformAdmin: input.platformAdmin,
    });
  }
}
