import { SchoolInvitation } from '../entities/SchoolInvitation.js';
import { Email } from '../../../shared/domain/value-objects/Email.js';

export interface SchoolInvitationRepository {
  save(invitation: SchoolInvitation): Promise<SchoolInvitation>;
  findById(id: string): Promise<SchoolInvitation | null>;
  findByTokenHash(tokenHash: string): Promise<SchoolInvitation | null>;
  findPendingBySchoolAndEmail(schoolId: string, email: Email): Promise<SchoolInvitation | null>;
  findBySchoolId(schoolId: string): Promise<SchoolInvitation[]>;
  delete(id: string): Promise<void>;
}
