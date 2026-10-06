import { UUID } from "crypto";

export interface ReplaceSchoolAdministratorInput {
  schoolId: UUID;
  newAdminUserId: UUID;
  performedBy: string;
}
