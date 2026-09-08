import type { GlobalRole } from '../../../domain/enum/global-role.enum.js';
import type UserStatus from '../../../domain/enum/user-status.enum.js';

// Shape of a persisted record; creation and business rules belong to User.
export interface PUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  globalRole: GlobalRole;
  status: `${UserStatus}`;
}
