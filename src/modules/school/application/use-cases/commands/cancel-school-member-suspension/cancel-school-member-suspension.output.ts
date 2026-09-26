import type { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';

export interface CancelSchoolMemberSuspensionOutput {
  membership: SchoolMembership;
}
