import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolInvitationNotFoundException } from '../../../../domain/exceptions/school-invitation-not-found.exception.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolInvitationOutput } from '../../school.output.js';
import type { CancelSchoolInvitationInput } from './cancel-school-invitation.input.js';
import type { CancelSchoolInvitationOutput } from './cancel-school-invitation.output.js';

export class CancelSchoolInvitationUseCase {
  constructor(
    private readonly invitations: SchoolInvitationRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(input: CancelSchoolInvitationInput): Promise<CancelSchoolInvitationOutput> {
    if (!input.schoolId?.trim() || !input.invitationId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID and invitation ID are required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    await this.authorization.assertSchoolAdmin(
      { userId: input.performedBy, platformAdmin: input.platformAdmin },
      input.schoolId,
    );

    const invitation = await this.invitations.findById(input.invitationId);
    if (!invitation || invitation.schoolId !== input.schoolId) {
      throw new SchoolInvitationNotFoundException(input.schoolId, input.invitationId);
    }

    // Only a PENDING invitation (expired or not) can be cancelled.
    invitation.cancel();
    const saved = await this.invitations.save(invitation);
    return { invitation: toSchoolInvitationOutput(saved) };
  }
}
