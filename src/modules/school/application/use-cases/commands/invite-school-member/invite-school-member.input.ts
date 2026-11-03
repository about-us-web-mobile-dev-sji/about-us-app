export interface InviteSchoolMemberInput {
  schoolId: string;
  email: string;
  performedBy: string;
  /** See SchoolActor.platformAdmin. */
  platformAdmin?: boolean;
}
