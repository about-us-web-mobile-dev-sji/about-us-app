import type { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';
import type { MembershipRole } from '../../../../domain/enums/membership-role.enum.js';

// Deliberately excludes the token and its hash: the token only travels to
// the invitee through the notification.
export interface InviteSchoolMemberOutput {
  invitation: {
    id: string;
    schoolId: string;
    email: string;
    role: MembershipRole;
    status: InvitationStatus;
    expiresAt: Date;
  };
}
