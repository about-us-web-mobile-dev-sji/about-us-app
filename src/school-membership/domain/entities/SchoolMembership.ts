import { Role } from '../../../shared/domain/enums/Role.js';
import { MembershipStatus } from '../enums/MembershipStatus.js';

export class SchoolMembership {
  constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly schoolId: string,
    private role: Role,
    private status: MembershipStatus,
    private isPrimaryAdministrator: boolean,
    private readonly startedAt: Date,
    private endedAt: Date | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.userId;
  }

  getSchoolId(): string {
    return this.schoolId;
  }

  getRole(): Role {
    return this.role;
  }

  getStatus(): MembershipStatus {
    return this.status;
  }

  getIsPrimaryAdministrator(): boolean {
    return this.isPrimaryAdministrator;
  }

  getStartedAt(): Date {
    return this.startedAt;
  }

  getEndedAt(): Date | null {
    return this.endedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  isActive(): boolean {
    return this.status === MembershipStatus.ACTIVE && this.endedAt === null;
  }

  activate(): void {
    this.status = MembershipStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = MembershipStatus.INACTIVE;
    this.endedAt = new Date();
    this.updatedAt = new Date();
  }

  suspend(): void {
    this.status = MembershipStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  setPrimaryAdministrator(isPrimary: boolean): void {
    this.isPrimaryAdministrator = isPrimary;
    this.updatedAt = new Date();
  }

  changeRole(newRole: Role): void {
    this.role = newRole;
    this.updatedAt = new Date();
  }
}
