import type UserStatus from '../../../domain/enum/user-status.enum.js';

// Shape of a persisted record; creation and business rules belong to User.
export interface PUser {
  role: import("../../../domain/enum/user-role.enum.js").default;
  id: string;
  schoolId?: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: `${UserStatus}`;
}
