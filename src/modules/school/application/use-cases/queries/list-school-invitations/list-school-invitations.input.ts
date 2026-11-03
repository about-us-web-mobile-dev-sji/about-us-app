import type { TrackedInvitationStatus } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { PaginationParams } from '../../../../../../shared/domain/pagination.js';

export interface ListSchoolInvitationsInput {
  schoolId: string;
  performedBy: string;
  /** See SchoolActor.platformAdmin. */
  platformAdmin?: boolean;
  status?: TrackedInvitationStatus;
  search?: string;
  pagination?: PaginationParams;
}
