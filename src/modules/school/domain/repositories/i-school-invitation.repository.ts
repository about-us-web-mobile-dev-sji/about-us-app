import type { SchoolInvitation } from '../entities/school-invitation.entity.js';

export const SCHOOL_INVITATION_REPOSITORY = Symbol(
  'SCHOOL_INVITATION_REPOSITORY',
);

export interface SchoolInvitationRepository {
  findByTokenHash(tokenHash: string): Promise<SchoolInvitation | null>;
  findPendingBySchoolAndEmail(
    schoolId: string,
    email: string,
  ): Promise<SchoolInvitation[]>;
  save(invitation: SchoolInvitation): Promise<SchoolInvitation>;
}
