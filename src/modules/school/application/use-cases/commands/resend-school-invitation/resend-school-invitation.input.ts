export interface ResendSchoolInvitationInput {
  schoolId: string;
  invitationId: string;
  performedBy: string;
  /** See SchoolActor.platformAdmin. */
  platformAdmin?: boolean;
}
