import type { SchoolInvitationOutput } from '../../school.output.js';
import type { PaginatedResult } from '../../../../../../shared/domain/pagination.js';

export type ListSchoolInvitationsOutput = PaginatedResult<SchoolInvitationOutput>;
