import type { SchoolMembership } from '../../../../domain/entities/school-membership.entity.js';

export interface RevokeSchoolMemberOutput {
  membership: SchoolMembership;
}
