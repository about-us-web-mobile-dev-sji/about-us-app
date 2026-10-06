import type { InvitationStatus } from '../../../../domain/enums/invitation-status.enum.js';

// Deliberately excludes the token and its hash: the token only travels to
// the invitee through the notification.
export interface InviteSchoolMemberOutput {
  invitation: {
    id: string;
    schoolId: string;
    email: string;
    roleId: string;
    status: InvitationStatus;
    expiresAt: Date;
  };
}
