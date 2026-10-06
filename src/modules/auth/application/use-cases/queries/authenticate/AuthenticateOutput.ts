import type { GlobalRole } from '../../../../../user/domain/enum/global-role.enum.js';

export interface AuthenticateOutput {
  user: { id: string; email: string; globalRole: GlobalRole };
  subjectId: string;
  sessionId: string;
}
