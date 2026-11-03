import type { SchoolInvitation } from '../entities/school-invitation.entity.js';
import type { InvitationStatus } from '../enums/invitation-status.enum.js';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/pagination.js';

/**
 * The status shown when following invitations: a PENDING invitation whose
 * expiry date has passed is reported as EXPIRED.
 */
export type TrackedInvitationStatus = InvitationStatus | 'EXPIRED';

export interface SchoolInvitationFilters {
  status?: TrackedInvitationStatus;
  /** Case-insensitive match on the invited e-mail. */
  search?: string;
}

export const SCHOOL_INVITATION_REPOSITORY = Symbol(
  'SCHOOL_INVITATION_REPOSITORY',
);

export interface SchoolInvitationRepository {
  findByTokenHash(tokenHash: string): Promise<SchoolInvitation | null>;
  findPendingBySchoolAndEmail(
    schoolId: string,
    email: string,
  ): Promise<SchoolInvitation[]>;
  /** True when an unexpired PENDING invitation exists for this e-mail, in any school. */
  hasPendingForEmail(email: string): Promise<boolean>;
  findById(id: string): Promise<SchoolInvitation | null>;
  /** Most recent first. */
  findBySchoolPaginated(
    schoolId: string,
    filters: SchoolInvitationFilters,
    pagination: PaginationParams,
    now?: Date,
  ): Promise<PaginatedResult<SchoolInvitation>>;
  save(invitation: SchoolInvitation): Promise<SchoolInvitation>;
}
