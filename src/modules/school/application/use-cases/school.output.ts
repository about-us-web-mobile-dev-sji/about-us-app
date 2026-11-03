import type { School } from '../../domain/entities/school.entity.js';
import type { SchoolInvitation } from '../../domain/entities/school-invitation.entity.js';
import type { TrackedInvitationStatus } from '../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolMembership } from '../../domain/entities/school-membership.entity.js';
import type { MembershipStatus } from '../../domain/enums/membership-status.enum.js';
import type { SchoolStatus } from '../../domain/enums/school-status.enum.js';
import type { SchoolRole } from '../../domain/enums/school-role.enum.js';

export interface SchoolOutput {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SchoolMembershipOutput {
  id: string;
  schoolId: string;
  userId: string;
  status: MembershipStatus;
  grantedBy: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  role: SchoolRole;
}

export function toSchoolOutput(school: School): SchoolOutput {
  const primitives = school.toPrimitives();
  return { ...primitives, id: primitives.id as string };
}

export function toSchoolMembershipOutput(
  membership: SchoolMembership,
): SchoolMembershipOutput {
  return membership.toPrimitives();
}

// An invitation as followed by the school administrator; never carries the token.
export interface SchoolInvitationOutput {
  id: string;
  schoolId: string;
  email: string;
  role: SchoolRole;
  status: TrackedInvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: string;
  acceptedAt: Date | null;
  acceptedBy: string | null;
}

export const toSchoolInvitationOutput = (
  invitation: SchoolInvitation,
  now: Date = new Date(),
): SchoolInvitationOutput => {
  const p = invitation.toPrimitives();
  return {
    id: p.id,
    schoolId: p.schoolId,
    email: p.email,
    role: p.role,
    status: invitation.trackedStatus(now),
    expiresAt: p.expiresAt,
    createdAt: p.createdAt,
    invitedBy: p.invitedBy,
    acceptedAt: p.acceptedAt,
    acceptedBy: p.acceptedBy,
  };
};
