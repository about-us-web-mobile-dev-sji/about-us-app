import { InvalidSchoolMembershipException } from '../../../../domain/exceptions/invalid-school-membership.exception.js';
import { SchoolNotFoundException } from '../../../../domain/exceptions/school-not-found.exception.js';
import { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import type { SchoolInvitationRepository } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolRepository } from '../../../../domain/repositories/i-school.repository.js';
import type { SchoolAuthorizationService } from '../../../services/school-authorization.service.js';
import { toSchoolInvitationOutput } from '../../school.output.js';
import type { ListSchoolInvitationsInput } from './list-school-invitations.input.js';
import type { ListSchoolInvitationsOutput } from './list-school-invitations.output.js';
import type { UUID } from 'node:crypto';

const TRACKED_STATUSES: string[] = [...Object.values(InvitationStatus), 'EXPIRED'];

export class ListSchoolInvitationsUseCase {
  constructor(
    private readonly schools: SchoolRepository,
    private readonly invitations: SchoolInvitationRepository,
    private readonly authorization: SchoolAuthorizationService,
  ) {}

  async handle(input: ListSchoolInvitationsInput): Promise<ListSchoolInvitationsOutput> {
    if (!input.schoolId?.trim()) {
      throw new InvalidSchoolMembershipException('School ID is required');
    }
    if (!input.performedBy?.trim()) {
      throw new InvalidSchoolMembershipException('PerformedBy is required');
    }

    await this.authorization.assertSchoolAdmin(
      { userId: input.performedBy, platformAdmin: input.platformAdmin },
      input.schoolId,
    );

    const school = await this.schools.findById(input.schoolId as UUID);
    if (!school) {
      throw new SchoolNotFoundException(input.schoolId);
    }

    const page = input.pagination?.page ?? 1;
    const limit = input.pagination?.limit ?? 20;
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidSchoolMembershipException('Page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new InvalidSchoolMembershipException('Limit must be between 1 and 100');
    }
    if (input.status !== undefined && !TRACKED_STATUSES.includes(input.status)) {
      throw new InvalidSchoolMembershipException(
        'Status must be PENDING, ACCEPTED, CANCELLED or EXPIRED',
      );
    }
    if (input.search !== undefined && input.search.trim().length > 200) {
      throw new InvalidSchoolMembershipException('Search must not exceed 200 characters');
    }

    const now = new Date();
    const result = await this.invitations.findBySchoolPaginated(
      input.schoolId,
      { status: input.status, search: input.search?.trim() || undefined },
      { page, limit },
      now,
    );

    return {
      items: result.items.map((invitation) => toSchoolInvitationOutput(invitation, now)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
