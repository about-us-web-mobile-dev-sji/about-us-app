export interface CancelSchoolInvitationInput {
  schoolId: string;
  invitationId: string;
  performedBy: string;
  /** See SchoolActor.platformAdmin. */
  platformAdmin?: boolean;
}
