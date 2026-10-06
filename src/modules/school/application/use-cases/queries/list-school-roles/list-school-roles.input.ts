export interface ListSchoolRolesInput {
  schoolId: string;
  performedBy: string;
  /** See SchoolActor.platformAdmin. */
  platformAdmin?: boolean;
}
