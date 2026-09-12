import { Role } from '../../../../shared/domain/enums/Role.js';
import { MembershipStatus } from '../../../domain/enums/MembershipStatus.js';

export class MembershipResponse {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly schoolId: string,
    public readonly role: Role,
    public readonly status: MembershipStatus,
    public readonly isPrimaryAdministrator: boolean,
    public readonly startedAt: Date,
    public readonly endedAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}

export class ReplaceAdministratorResponse {
  constructor(
    public readonly schoolId: string,
    public readonly previousAdministratorId: string | null,
    public readonly newAdministratorId: string | null,
    public readonly invitationSent: boolean,
    public readonly replacedAt: Date,
  ) {}
}
