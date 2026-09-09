import type UserStatus from '../../../domain/enum/user-status.enum.js';

// Shape of a persisted record; creation and business rules belong to User.
export interface PUser {
  id: string;
  schoolId?: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: `${UserStatus}`;
}
