export interface InviteSchoolMemberInput {
  schoolId: string;
  email: string;
  // Defaults to the school's student role; the administrator role is refused.
  roleId?: string;
  performedBy: string;
}
