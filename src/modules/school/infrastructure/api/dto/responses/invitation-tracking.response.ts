import type { SchoolRole } from '../../../../domain/enums/school-role.enum.js';
import type { TrackedInvitationStatus } from '../../../../domain/repositories/i-school-invitation.repository.js';
import type { SchoolInvitationOutput } from '../../../../application/use-cases/school.output.js';
import { summaryOf, type UserSummaries, type UserSummary } from '../../../../../user/application/user-directory.js';

export class InvitationTrackingResponse {
  id!: string;
  schoolId!: string;
  email!: string;
  role!: SchoolRole;
  status!: TrackedInvitationStatus;
  expiresAt!: Date;
  createdAt!: Date;
  invitedBy!: UserSummary;
  acceptedAt!: Date | null;
  acceptedBy!: UserSummary | null;

  static fromOutput(output: SchoolInvitationOutput, users: UserSummaries): InvitationTrackingResponse {
    return {
      id: output.id,
      schoolId: output.schoolId,
      email: output.email,
      role: output.role,
      status: output.status,
      expiresAt: output.expiresAt,
      createdAt: output.createdAt,
      invitedBy: summaryOf(users, output.invitedBy),
      acceptedAt: output.acceptedAt,
      acceptedBy: summaryOf(users, output.acceptedBy),
    };
  }

  static userIdsOf(output: SchoolInvitationOutput): (string | null)[] {
    return [output.invitedBy, output.acceptedBy];
  }
}
